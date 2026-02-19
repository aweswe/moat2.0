# agenttrace/core/tracer.py
import os
import sys
import json
import uuid
import time as time_module
try:
    from agenttrace.cloud.synchronizer import CloudSynchronizer
except ImportError:
    CloudSynchronizer = None
import threading
import queue
import hashlib
from enum import Enum
from typing import Optional, Dict, Any, Iterable, List
from agenttrace.core.checkpoint import CheckpointManager
from agenttrace.core.state_capture import capture_current_state
from agenttrace.core.vfs_bridge import VFS_FILES
import requests
from contextlib import contextmanager
from datetime import datetime

# optional numpy support for RNG
try:
    import numpy as _np
    _HAS_NUMPY = True
except Exception:
    _HAS_NUMPY = False

class ReplayError(Exception):
    """Raised when replay diverges from recorded history."""
    pass

_original_time = time_module.time

class Mode(Enum):
    RECORD = "RECORD"
    REPLAY = "REPLAY"
    OFF = "OFF"

class ReplayPhase(Enum):
    INIT = "INIT"
    APPLY = "APPLY"
    LIVE = "LIVE"
    CLEANUP = "CLEANUP"

def _atomic_write(path: str, data: bytes):
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)

class Tracer:
    _instance = None
    _instance_pid = None

    @classmethod
    def get_instance(cls):
        pid = os.getpid()
        if cls._instance is None or cls._instance_pid != pid:
            cls._instance = cls()
            cls._instance_pid = pid
        return cls._instance

    def __init__(self, keyframe_interval: int = 10, storage_root: str = ".agenttrace/traces"):
        self.mode = Mode.OFF
        self.trace_id: Optional[str] = None
        self.storage_root = storage_root
        self.keyframe_interval = keyframe_interval
        self.storage_root = storage_root
        self.keyframe_interval = keyframe_interval
        self.start_time = None
        self.checkpoint_manager = CheckpointManager()
        self._pending_restore_state = None
        self.branch_overrides: Dict[int, Any] = {}
        self.branch_id: Optional[str] = None
        
        # Forking support: "Silent Fast Forward"
        # If set, we skip recording events until seq > fork_step
        self.fork_step: Optional[int] = None
        try:
            if os.environ.get("AGENTTRACE_FORK_STEP"):
                self.fork_step = int(os.environ["AGENTTRACE_FORK_STEP"])
                print(f"[Tracer] Fork mode active. Fast-forwarding until step {self.fork_step}...")
        except ValueError:
            pass
        
        self.branch_fork_step: Optional[int] = None
        self.script_path: Optional[str] = None
        self.script_content: Optional[str] = None
        self.event_override: Optional[dict] = None
        self.event_overrides: Dict[str, dict] = {}
        
        # Cloud Sync State
        self._sync_queue: queue.Queue = queue.Queue()
        self._sync_thread: Optional[threading.Thread] = None
        self._stop_sync = threading.Event()
        self.api_key = os.environ.get("AGENTTRACE_API_KEY")
        self.api_url = os.environ.get("AGENTTRACE_API_URL", "https://moat-kappa.vercel.app/api")

        # Checkpoint Mode (DEFAULT or DELTA_ONLY)
        # DELTA_ONLY = No pickle binary blobs, pure JSON events
        self.checkpoint_mode = os.environ.get("AGENTTRACE_CHECKPOINT_MODE", "DEFAULT").upper()
        
        # In-memory cache for small traces; large traces are appended to disk
        self._event_lock = threading.Lock()
        self._event_seq = 0  # next seq number
        self._events_mem: list = []  # short-term caching
        self._events_file_path: Optional[str] = None
        self.keyframes: Dict[int, str] = {}  # step -> checkpoint_path (on disk)
        os.makedirs(self.storage_root, exist_ok=True)
        self._closed = False
        self._guard = threading.local()
        
        # Cloud Sync (Layer 2)
        self.synchronizer: Optional[CloudSynchronizer] = None
        if CloudSynchronizer and os.environ.get("NEXT_PUBLIC_SUPABASE_URL"):
            self.synchronizer = CloudSynchronizer(
                os.environ["NEXT_PUBLIC_SUPABASE_URL"],
                os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
            )
        
        # Audit context for compliance tracking
        self.audit_context: Dict[str, Any] = {
            "user_id": os.environ.get("AGENTTRACE_USER_ID"),
            "job_id": os.environ.get("AGENTTRACE_JOB_ID"),
            "run_version": os.environ.get("AGENTTRACE_RUN_VERSION", "1"),
            "seed": None  # Set during deterministic runs
        }

        self.replay_phase = ReplayPhase.INIT
        
        # Adaptive batching config
        self.batch_size = 50  # Target batch size
        self.batch_timeout = 5.0  # Flush every 5 seconds even if batch not full
        self.last_flush_time = time_module.time()

        # Auto-start if running in worker context (subprocess)
        env_trace_id = os.environ.get("AGENTTRACE_TRACE_ID")
        auto_enable = os.environ.get("AGENTTRACE_ENABLE") == "1"
        
        if env_trace_id and auto_enable:
            mode = os.environ.get("AGENTTRACE_MODE", "RECORD").upper()
            if mode == "REPLAY":
                print(f"[Tracer] Auto-starting REPLAY for trace {env_trace_id}")
                self.start_replay(trace_id=env_trace_id)
            else:
                print(f"[Tracer] Auto-starting RECORDING for trace {env_trace_id} (append_mode=True)")
                self.start_recording(trace_id=env_trace_id, append_mode=True)

    @contextmanager
    def disable_instrumentation(self):
        if not hasattr(self._guard, "disabled"):
            self._guard.disabled = False
        prev = self._guard.disabled
        self._guard.disabled = True
        try:
            yield
        finally:
            self._guard.disabled = prev

    def _get_replay_handlers(self):
        return {
            "makedirs": self._handle_replay_makedirs,
            "file_write": self._handle_replay_file_write,
            "file_rename": self._handle_replay_file_rename,
            "dir_rename": self._handle_replay_dir_rename,
            "file_remove": self._handle_replay_file_remove,
            "rmdir": self._handle_replay_rmdir,
            "file_exists": self._handle_replay_file_exists,
            "file_isdir": self._handle_replay_file_isdir,
            # Async Events
            "async_task_spawn": self._handle_replay_async_event,
            "async_task_start": self._handle_replay_async_event,
            "async_task_complete": self._handle_replay_async_event,
            "async_task_exception": self._handle_replay_async_event,
        }

    # -----------------------
    # Replay Handlers (Short-circuiting)
    # -----------------------
    def _handle_replay_makedirs(self, recorded_payload: dict, current_payload: dict):
        # Validation: check if paths match
        if recorded_payload.get("path") != current_payload.get("path"):
            raise ReplayError(f"makedirs path mismatch: recorded={recorded_payload.get('path')}, current={current_payload.get('path')}")
        return True

    def _handle_replay_file_write(self, recorded_payload: dict, current_payload: dict):
        if recorded_payload.get("path") != current_payload.get("path"):
            raise ReplayError(f"file_write path mismatch: recorded={recorded_payload.get('path')}, current={current_payload.get('path')}")
        return True

    def _handle_replay_file_rename(self, recorded_payload: dict, current_payload: dict):
        if recorded_payload.get("old") != current_payload.get("old") or recorded_payload.get("new") != current_payload.get("new"):
            raise ReplayError(f"file_rename mismatch: recorded={recorded_payload.get('old')}->{recorded_payload.get('new')}, current={current_payload.get('old')}->{current_payload.get('new')}")
        return True

    def _handle_replay_dir_rename(self, recorded_payload: dict, current_payload: dict):
        if recorded_payload.get("old") != current_payload.get("old") or recorded_payload.get("new") != current_payload.get("new"):
            raise ReplayError(f"dir_rename mismatch: recorded={recorded_payload.get('old')}->{recorded_payload.get('new')}, current={current_payload.get('old')}->{current_payload.get('new')}")
        return True

    def _handle_replay_file_remove(self, recorded_payload: dict, current_payload: dict):
        if recorded_payload.get("path") != current_payload.get("path"):
            raise ReplayError(f"file_remove path mismatch: recorded={recorded_payload.get('path')}, current={current_payload.get('path')}")
        return True

    def _handle_replay_rmdir(self, recorded_payload: dict, current_payload: dict):
        if recorded_payload.get("path") != current_payload.get("path"):
            raise ReplayError(f"rmdir path mismatch: recorded={recorded_payload.get('path')}, current={current_payload.get('path')}")
        return True

    def _handle_replay_file_exists(self, recorded_payload: dict, current_payload: dict):
        if recorded_payload.get("path") != current_payload.get("path"):
            raise ReplayError(f"file_exists path mismatch: recorded={recorded_payload.get('path')}, current={current_payload.get('path')}")
        return True

    def _handle_replay_file_isdir(self, recorded_payload: dict, current_payload: dict):
        if recorded_payload.get("path") != current_payload.get("path"):
            raise ReplayError(f"file_isdir path mismatch: recorded={recorded_payload.get('path')}, current={current_payload.get('path')}")
        return True

    def _handle_replay_async_event(self, recorded_payload: dict, current_payload: dict):
        # For now, we just validate existence. 
        # Future: timestamp correlation or causal ID matching.
        return True

    # @classmethod get_instance is now defined above for clarity


    # -----------------------
    # Lifecycle: start/stop
    # -----------------------
    def _trace_dir(self, trace_id: str) -> str:
        d = os.path.join(self.storage_root, trace_id)
        os.makedirs(d, exist_ok=True)
        return d

    def start_recording(
        self, 
        script_path: Optional[str] = None, 
        script_content: Optional[str] = None, 
        trace_id: Optional[str] = None, 
        append_mode: bool = False,
        # Atomic injection parameters - applied AFTER initialization
        fork_step: Optional[int] = None,
        event_override: Optional[dict] = None,  # Legacy single override (backward compat)
        event_overrides: Optional[Dict[str, dict]] = None,  # NEW: Multi-tool overrides
        # Test isolation - skip heavy patching
        skip_instrumentation: bool = False
    ):
        """Start recording a new trace."""
        # NEW: Immediately read script content
        if script_path and os.path.exists(script_path):
            try:
                with open(script_path, "r", encoding="utf-8") as f:
                    script_content = f.read()
                print(f"[AgentTrace] Captured script content ({len(script_content)} bytes)")
            except Exception as e:
                print(f"[AgentTrace] Warning: Failed to read script: {e}")
        
        self.start_time = time_module.time()
        
        if not trace_id:
            # Re-use existing trace_id if already active, otherwise generate new one
            trace_id = self.trace_id or str(uuid.uuid4())
            
        self.trace_id = trace_id
        self.script_path = script_path
        self.script_content = script_content
        
        with self._event_lock:
            # If we are in REPLAY mode (set by environment), skip start_recording
            if self.mode == Mode.REPLAY:
                print(f"[AgentTrace] Replaying trace {self.trace_id} (skipping start_recording)")
                return
            
            # If we are already RECORDING and no new ID provided, don't restart
            if self.mode == Mode.RECORD and not trace_id:
                return

            # Reset closed flag
            self._closed = False
            
            self.mode = Mode.RECORD
            # trace_id already set above
            
            # Refresh cloud config from environment
            self.api_key = os.environ.get("AGENTTRACE_API_KEY")
            self.api_url = os.environ.get("AGENTTRACE_API_URL", "https://moat-kappa.vercel.app/api")
            
            trace_dir = self._trace_dir(self.trace_id)
            self._events_file_path = os.path.join(trace_dir, "events.jsonl")
            
            if append_mode:
                # Append mode: count existing events to continue sequencing
                # Optimized: use _next_sequence_number_from_file instead of full read
                self._events_mem = []
                self._event_seq = self._next_sequence_number_from_file()
                print(f"[AgentTrace] Append mode: starting at seq {self._event_seq}")
            else:
                # Fresh start: clear old events file if it exists
                if os.path.exists(self._events_file_path):
                    try:
                        os.remove(self._events_file_path)
                    except Exception as e:
                        print(f"[AgentTrace] warning: failed to remove old trace {self._events_file_path}: {e}")
                
                # FORCE CREATION NOW to ensure file exists before append
                try:
                    with open(self._events_file_path, "w", encoding="utf-8") as f:
                        pass
                    print(f"[AgentTrace] [OK] Created new events file: {self._events_file_path}")
                except Exception as e:
                    print(f"[AgentTrace] [ERROR] Failed to create events file {self._events_file_path}: {e}")
                    print(f"[AgentTrace] Cleared old events file for fresh recording")
                self._event_seq = 0
            
            self._events_mem = []
            self.keyframes = {}
            self.script_path = script_path
            self.script_content = script_content
            
            # Reset fork/branch state FIRST
            self.branch_overrides = {}
            self.branch_id = None
            self.branch_fork_step = None
            
            # ATOMIC INJECTION: Apply fork_step and event_override AFTER reset
            # This ensures they cannot be accidentally clobbered
            if fork_step is not None:
                self.fork_step = int(fork_step)
                print(f"[AgentTrace] [FORK] Fork mode enabled: injection at step {self.fork_step}")
            else:
                self.fork_step = None
            
            if event_override is not None:
                # Deep copy to prevent external mutations
                import copy
                self.event_override = copy.deepcopy(event_override)
                override_tool = event_override.get("payload", {}).get("tool") or event_override.get("tool", "unknown")
                print(f"[AgentTrace] [FORK] Event override set for tool: {override_tool}")
            else:
                self.event_override = None
            
            # NEW: Multi-tool overrides dict
            if event_overrides is not None:
                import copy
                self.event_overrides = copy.deepcopy(event_overrides)
                print(f"[AgentTrace] [FORK] Multi-tool overrides set for: {list(event_overrides.keys())}")
            else:
                self.event_overrides = {}
            
            self._save_metadata()
            
            # Auto-Instrumentation and VFS (skip for tests)
            if not skip_instrumentation:
                try:
                    from agenttrace.instrumentation.patch import apply_patches
                    apply_patches()
                    print(f"[AgentTrace] Auto-instrumentation (incl. VFS) applied for {self.trace_id}")
                except Exception as e:
                    print(f"[AgentTrace] Failed to apply auto-instrumentation: {e}")

            # Supabase Registration (Phase 4)
            self._register_trace_in_supabase(script_path)
            
            print(f"[AgentTrace] Recording started: {self.trace_id}")

    def _register_trace_in_supabase(self, script_path: Optional[str]):
        """Register the trace in the Supabase 'traces' table."""
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            return

        try:
            # 1. Fetch first available Org if not provided
            org_id = os.environ.get("AGENTTRACE_ORG_ID")
            if not org_id:
                # Get orgs via PostgREST
                org_resp = requests.get(
                    f"{supabase_url}/rest/v1/organizations?select=id",
                    headers={
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}"
                    },
                    timeout=5
                )
                if org_resp.ok and org_resp.json():
                    org_id = org_resp.json()[0]['id']
            
            if not org_id:
                print("[AgentTrace] [WARN] Could not determine Org ID for trace registration")
                return

            # 2. Insert Trace Record
            trace_data = {
                "id": self.trace_id,
                "org_id": org_id,
                "title": os.path.basename(script_path) if script_path else "Untitled Trace",
                "status": "ready",
                "parent_trace_id": getattr(self, "source_trace_id", None),
                "fork_step": getattr(self, "branch_fork_step", None),
                "metadata": {
                    "sdk": "python",
                    "version": "2.0.0",
                    "is_branch": bool(getattr(self, "branch_id", None))
                }
            }
            
            resp = requests.post(
                f"{supabase_url}/rest/v1/traces",
                json=trace_data,
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                timeout=10
            )
            
            if resp.status_code in (201, 204, 409):
                if resp.status_code == 409:
                    print(f"[AgentTrace] [INFO] Trace {self.trace_id} already exists in Supabase")
                else:
                    print(f"[AgentTrace] [OK] Trace registered in Supabase: {self.trace_id}")
            else:
                print(f"[AgentTrace] [WARN] Trace registration failed: {resp.status_code} - {resp.text}")

            # 3. Upload Script to Storage
            if self.script_content:
                self._upload_to_supabase_storage("traces", f"{self.trace_id}/script.py", self.script_content)

        except Exception as e:
            print(f"[AgentTrace] [WARN] Supabase registration error: {e}")

    def _upload_to_supabase_storage(self, bucket: str, path: str, content: Any):
        """Helper to upload content to Supabase Storage."""
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            return False

        try:
            if isinstance(content, str):
                content = content.encode("utf-8")
                
            url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
            resp = requests.post(
                url,
                data=content,
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "upsert": "true"
                },
                timeout=15
            )
            
            if resp.ok:
                print(f"[AgentTrace] [OK] Uploaded {path} to bucket '{bucket}'")
                return True
            else:
                # Try PUT if POST fails (upsert might need different method or headers)
                resp = requests.put(
                    url,
                    data=content,
                    headers={
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}"
                    },
                    timeout=15
                )
                if resp.ok:
                    print(f"[AgentTrace] [OK] Updated {path} in bucket '{bucket}'")
                    return True
                else:
                    print(f"[AgentTrace] [ERROR] Storage upload failed: {resp.status_code} - {resp.text}")
                    return False
        except Exception as e:
            print(f"[AgentTrace] [WARN] Storage upload error: {e}")
            return False

    def try_consume_injected_result(self, tool_name: str) -> tuple:
        """Atomically check and consume an injected result for this tool invocation.
        
        This is the ONLY method decorators should call for injection. It combines:
        1. Check if injection should happen (matching tool name)
        2. Parse and return the injected value
        3. Record the synthetic tool_end event
        4. Clear the override (one-time use per tool)
        
        Supports both:
        - Legacy: self.event_override (single override)
        - New: self.event_overrides[tool_name] (multi-tool dict)
        
        All under a single lock to prevent race conditions.
        
        Returns:
            (True, result) if injection applied
            (False, None) if no injection
        """
        with self._event_lock:
            override_payload = None
            override_source = None
            
            # DEBUG: Log current state
            print(f"[Injection] Checking for tool: {tool_name}")
            print(f"[Injection] Mode: {self.mode}")
            print(f"[Injection] Fork step: {self.fork_step}")
            print(f"[Injection] Current seq: {self._event_seq}")
            
            # Check multi-tool overrides first (new way)
            if hasattr(self, 'event_overrides') and tool_name in self.event_overrides:
                override_entry = self.event_overrides[tool_name]
                override_payload = override_entry.get("payload", override_entry)
                override_source = "multi"
                print(f"[Injection] [OK] Found multi-tool override for {tool_name}")
            
            # Fall back to legacy single override
            elif hasattr(self, 'event_override') and self.event_override is not None:
                override_entry = self.event_override
                override_payload_raw = override_entry.get("payload", {})
                override_tool = override_payload_raw.get("tool") or override_entry.get("tool")
                override_type = override_entry.get("type", "")
                
                print(f"[Injection] Legacy override check: type={override_type}, tool={override_tool}")
                
                # Legacy requires type and tool match
                if override_type == "tool_end" and override_tool == tool_name:
                    override_payload = override_payload_raw
                    override_source = "legacy"
                    print(f"[Injection] [OK] Found legacy override for {tool_name}")
                else:
                    print(f"[Injection] [ERROR] Legacy override mismatch (expected tool_end/{tool_name})")
            
            # No matching override found
            if override_payload is None:
                print(f"[Injection] [ERROR] No override found for {tool_name}")
                return False, None
            
            # Parse the result from override
            result = override_payload.get("result")
            
            # Parse if string representation of dict/list
            if isinstance(result, str):
                try:
                    import ast
                    result = ast.literal_eval(result)
                except:
                    pass
            
            print(f"[Injection] [FORK] APPLYING INJECTION for {tool_name}: {result}")
            
            # Record the synthetic tool_end event
            seq = self._event_seq
            event = {
                "seq": seq,
                "type": "tool_end",
                "payload": {
                    "tool": tool_name,
                    "result": result,
                    "injected": True
                },
                "timestamp": __import__('time').time()
            }
            self._event_seq += 1
            
            # Persist immediately
            self._append_events_to_file([event])
            
            # Clear the override
            if override_source == "multi":
                del self.event_overrides[tool_name]
                print(f"[Injection] Cleared multi-tool override for {tool_name}")
            else:
                self.event_override = None
                print(f"[Injection] Cleared legacy override")
            
            return True, result
    
    # Keep old methods as deprecated wrappers for backward compatibility
    def should_inject_result(self, tool_name: str) -> bool:
        """DEPRECATED: Use try_consume_injected_result() instead."""
        with self._event_lock:
            if self.fork_step is None or self.event_override is None:
                return False
            override_payload = self.event_override.get("payload", {})
            override_tool = override_payload.get("tool") or self.event_override.get("tool")
            override_type = self.event_override.get("type", "")
            return override_type == "tool_end" and override_tool == tool_name
    
    def consume_injected_result(self) -> Any:
        """DEPRECATED: Use try_consume_injected_result() instead."""
        with self._event_lock:
            if self.event_override is None:
                return None
            payload = self.event_override.get("payload", self.event_override)
            result = payload.get("result")
            if isinstance(result, str):
                try:
                    import ast
                    result = ast.literal_eval(result)
                except:
                    pass
            self.event_override = None
            return result

    def start_replay(self, trace_id: str, target_step: Optional[int] = None, branch_data: Optional[dict] = None):
        """Start replaying an existing trace. VFS is used for determinism."""
        # Ensure patches are applied for VFS determinism
        try:
            from agenttrace.instrumentation.patch import apply_patches
            apply_patches()
        except: pass

        with self._event_lock:
            # For Dashboard/Interactive Branching: Replays should often be recorded as NEW traces
            # to allow the user to see the result.
            self.source_trace_id = trace_id
            
            # If we are in a branch or forced via environment, generate a NEW ID for recording
            if branch_data or os.environ.get("AGENTTRACE_RECORD_REPLAY") == "1":
                self.trace_id = str(uuid.uuid4())
                print(f"[AgentTrace] [BRANCH] Branching active: Recording replay to NEW trace {self.trace_id}")
                self.mode = Mode.RECORD # We want to RECORD events as they re-execute
                
                # Register the new trace so the dashboard can follow it
                self.api_key = os.environ.get("AGENTTRACE_API_KEY")
                if self.api_key:
                    self._register_trace_in_supabase(self.script_path)
            else:
                self.trace_id = trace_id
                self.mode = Mode.REPLAY
                
            self.replay_phase = ReplayPhase.APPLY
            
            source_trace_dir = self._trace_dir(self.source_trace_id)
            source_events_path = os.path.join(source_trace_dir, "events.jsonl")
            
            # Target dir for new recording
            target_trace_dir = self._trace_dir(self.trace_id)
            self._events_file_path = os.path.join(target_trace_dir, "events.jsonl")
            
            # VFS RECONSTRUCTION: Populate VFS_FILES from source history
            if os.path.exists(source_events_path):
                try:
                    import json
                    from agenttrace.core.replay import apply_event_to_state
                    from agenttrace.core.vfs_bridge import clear_vfs
                    clear_vfs()
                    with open(source_events_path, "r", encoding="utf-8") as f:
                        for line in f:
                            try:
                                ev = json.loads(line)
                                # Pre-populate VFS bridge with all file_write events from history
                                apply_event_to_state({}, ev)
                            except: pass
                except Exception as vfs_err:
                    print(f"[AgentTrace] VFS reconstruction warning: {vfs_err}")

            self.keyframes = self._load_keyframes(self.source_trace_id)
            self.branch_overrides = {}
            self.branch_id = None
            self.branch_fork_step = None
            self._events_mem = []
            
            # load event seq from disk header if exists (for re-using existing recording)
            self._event_seq = self._next_sequence_number_from_file() if self.mode == Mode.RECORD else 0
            
            if branch_data:
                if branch_data.get("parent_trace_id") != self.source_trace_id:
                    raise ValueError("Branch parent mismatch")
                overrides = branch_data.get("overrides", {})
                self.branch_overrides = {int(k): v for k, v in overrides.items()}
                self.branch_id = branch_data.get("branch_id")
                self.branch_fork_step = branch_data.get("fork_step")
                if target_step is None:
                    target_step = self.branch_fork_step
            
            if target_step is not None:
                self._jump_to_step(target_step)
            else:
                self.replay_cursor = 0
            
            self.replay_phase = ReplayPhase.LIVE
            print(f"[AgentTrace] Replay started: {self.source_trace_id} -> {self.trace_id} cursor={getattr(self,'replay_cursor',0)}")
            # For the API to capture the new trace ID
            if self.mode == Mode.RECORD:
                print(f"[OK] Trace recorded: {self.trace_id}")

    def consume_event(self, event_type: str, current_payload: Any) -> Any:
        """
        Called by patched functions in REPLAY mode.
        Validates event type and payload, then returns recorded result.
        """
        if self.mode != Mode.REPLAY:
            return None

        # 0. Drain non-VFS events (async tasks, etc) until we hit a sync event or EOF
        # This is CRITICAL for async/sync interleaving.
        while True:
            ev = self._read_event_by_seq(self.replay_cursor)
            if ev is None:
                raise ReplayError(f"Replay EOF: Expected event {event_type} at seq {self.replay_cursor} but reached end of history.")
            
            recorded_type = ev.get("type")
            
            # If matches expected type (or is a valid alias), break loop to validate
            if recorded_type == event_type:
                break
            # Alias check
            if {recorded_type, event_type} <= {"file_rename", "dir_rename"}:
                break
                
            # If it's a VFS event but NOT the one we want calling -> Divergence
            if recorded_type in ("file_write", "file_remove", "file_rename", "dir_rename", "makedirs", "rmdir", "file_exists", "file_isdir"):
                 raise ReplayError(f"Replay divergence: VFS mismatch. Expected {event_type}, found {recorded_type} at seq {self.replay_cursor}")
            
            # Otherwise, it's a passive event (async, log, etc).
            # We must consume it silently (or validate it if possible) and continue.
            # STRICT: We still validate it against handlers!
            handlers = self._get_replay_handlers()
            if recorded_type not in handlers:
                 raise ReplayError(f"Unknown event type in history: {recorded_type} (seq {self.replay_cursor})")
            
            # Validate passive event
            handler = handlers.get(recorded_type)
            if handler:
                handler(ev.get("payload"), {}) 
            
            # Advance past passive event
            self.replay_cursor += 1
            
        # --- End Drain Loop ---
        
        # Now we are at the matching event.
        # 1. Fetch again (it's the same ev from break)
        ev = self._read_event_by_seq(self.replay_cursor)
        recorded_type = ev.get("type")
        recorded_payload = ev.get("payload")
        
        # 2. Enforce Handler Existence
        handlers = self._get_replay_handlers()
        if recorded_type not in handlers:
             raise ReplayError(f"Unknown event type in history: {recorded_type} (seq {self.replay_cursor})")

        # 3. Match Event Type
        if recorded_type != event_type:
            if not ({recorded_type, event_type} <= {"file_rename", "dir_rename"}):
                raise ReplayError(f"Replay divergence: Expected {event_type} but found {recorded_type} at seq {self.replay_cursor}")

        # 4. Invoke Handler for Validation
        handler = handlers.get(recorded_type)
        if handler:
            cleaned_current = self._make_deterministic(current_payload)
            handler(recorded_payload, cleaned_current)

        # 5. Advance Cursor
        self.replay_cursor += 1
        
        # 6. Return recorded result
        return recorded_payload.get("result")

    def stop(self):
        """Flush and close resources  call on worker shutdown."""
        # Ensure we have the script content before closing
        if not self.script_content and self.script_path and os.path.exists(self.script_path):
             try:
                 with open(self.script_path, "r", encoding="utf-8") as f:
                     self.script_content = f.read()
             except: pass

        trace_id_copy = self.trace_id
        script_content_copy = self.script_content
        script_path_copy = self.script_path
        
        with self._event_lock:
            if self._events_mem:
                self._flush_events_to_disk()
            
            # Stop cloud sync
            if self._sync_thread:
                print("[AgentTrace] Finalizing cloud synchronization...")
                self._stop_sync.set()
                # Wait for queue to drain (max 30s for extreme stress tests)
                try:
                    self._sync_thread.join(timeout=30)
                except:
                    pass
                self._sync_thread = None

            was_recording = (self.mode == Mode.RECORD)
            self.mode = Mode.OFF
            
            # Teardown VFS Patcher
            if getattr(self, 'vfs_patcher', None):
                self.vfs_patcher.__exit__(None, None, None)
                self.vfs_patcher = None
                print("[AgentTrace] VFS Patcher deactivated")

            self.replay_phase = ReplayPhase.CLEANUP
            self.replay_phase = ReplayPhase.CLEANUP
            VFS_FILES.clear()
            
            # STRICT DETERMINISM CHECK
            # If we were replaying, ensure we consumed EVERYTHING.
            if self.mode == Mode.REPLAY and not self._closed:
                 # Check if history has more events
                 next_ev = self._read_event_by_seq(getattr(self, "replay_cursor", 0))
                 if next_ev is not None:
                     print(f"[AgentTrace] [ERROR] Replay ended prematurely! Unconsumed event at seq {self.replay_cursor}")
                     # We can't easily raise here since stop() is often called in finally blocks or atexit
                     # But we should log it loudly.
                     # raise ReplayError("Replay incomplete") 

            self._closed = True
            print("[AgentTrace] stopped and flushed")
        
        # UPLOAD TO SUPABASE (Phase 12: Layer 2 Sync)
        if was_recording and self.synchronizer:
            # 0. Update metadata with final stats
            self._update_final_metadata(trace_id_copy, success=True)
            
            # Non-blocking or blocking? For now blocking to ensure data safety.
            # In V2 we can make this background if process doesn't exit.
            try:
                self.synchronizer.upload_trace(trace_id_copy, self._trace_dir(trace_id_copy))
            except Exception as e:
                print(f"[AgentTrace] [ERROR] Cloud sync failed: {e}")

    # -----------------------
    # Event recording & storage
    # -----------------------
    def record_event(self, event_type: str, payload: Any, state_snapshot: Optional[dict] = None, auto_capture: bool = True):
        if getattr(self._guard, "disabled", False):
            return None

        print(f"DEBUG: record_event {event_type}", flush=True)
        if self.mode not in (Mode.RECORD, Mode.REPLAY):
            return None
        
        # Prevent internal recursion (e.g. time.time() calls inside here)
        with self.disable_instrumentation():
            with self._event_lock:
                seq = self._event_seq
                self._event_seq += 1

                # REPLAY MODE: Redirect to consume_event
                if self.mode == Mode.REPLAY:
                    return self.consume_event(event_type, payload)

                # Fork Logic: Silent Fast Forward
                # If we are in a fork and this step is already in history, skip recording it.
                if self.fork_step is not None and seq <= self.fork_step:
                    return seq

                # NEW: Clean payload BEFORE creating event
                deterministic_payload = self._make_deterministic(payload)

                event = {
                    "seq": seq,
                    "type": event_type,
                    "payload": deterministic_payload,  # CHANGED: Use cleaned payload
                    "timestamp": time_module.time_ns() / 1e9,  # Keep for debugging, exclude from hash
                    "is_keyframe": False,
                    "process_id": os.getpid()
                }
                
                # NEW: Add deterministic hash for comparison
                event["content_hash"] = self._compute_event_hash(event)
                
                # CRITICAL FIX: Direct append only. 
                # Do NOT buffer in memory for persistence to avoid double-write risks during crashes.
                # self._events_mem.append(event) 

            # flush on buffer growth to keep memory low
            # if len(self._events_mem) >= 50:
            #    self._flush_events_to_disk()

            # maybe create snapshot
            if state_snapshot is not None:
                snapshot = state_snapshot
            elif (seq % self.keyframe_interval == 0) and auto_capture:
                try:
                    # Pass checkpoint_mode to state capture
                    snapshot = capture_current_state(checkpoint_mode=self.checkpoint_mode)
                except Exception:
                    snapshot = None
            else:
                snapshot = None

            if snapshot is not None:
                # checkpoint manager expected: save_checkpoint(trace_id, step_id, agent_state, event_offset)
                try:
                    cp_path = self.checkpoint_manager.save_checkpoint(self.trace_id, seq, snapshot, event_offset=seq)
                    if cp_path:
                        self.keyframes[seq] = cp_path
                        event["is_keyframe"] = True
                        # optionally persist keyframes metadata immediately
                        self._save_keyframes()
                except Exception as e:
                    print(f"[AgentTrace] warning: failed to save keyframe {seq}: {e}")

            # persist event immediately (IMMEDIATE FLUSH)
            # This guarantees durability even if process crashes immediately after
            self._append_events_to_file([event])
            
            # self._events_mem = []  # cleared after flush



            # save metadata on first event
            if seq == 0:
                self._save_metadata()

            # Queue for cloud sync if enabled
            if self.api_key:
                self._ensure_sync_worker_running()
                if self._sync_thread and self._sync_thread.is_alive():
                    self._sync_queue.put(event)
                    # print(f"[AgentTrace] Debug: Event {event_type} queued for sync")

            return event["seq"]

    # -----------------------
    # High-level Helpers
    # -----------------------
    def thought(self, content: str):
        self.record_event("thought", {"content": content})

    def llm(self, content: str):
        self.record_event("llm", {"content": content})

    def tool(self, name: str, result: Any):
        self.record_event("tool_result", {"tool_name": name, "result": result})

    def exception(self, message: str, error: Exception):
        import traceback
        self.record_event("python_exception", {
            "error_type": type(error).__name__,
            "message": f"{message}: {str(error)}",
            "traceback": traceback.format_exc()
        })

    def _append_events_to_file(self, events: Iterable[dict]):
        """
        Append list of events to events.jsonl atomically.
        We write to a temp file and append to actual file to avoid interleaving in concurrent workers.
        """
        if not self.trace_id:
            raise RuntimeError("No trace id set")
        trace_dir = self._trace_dir(self.trace_id)
        events_path = os.path.join(trace_dir, "events.jsonl")
        
        # print(f"DEBUG: appending {len(list(events))} events to {events_path}") # Consumes iterable!
        ev_list = list(events)
        if not ev_list:
            return

        # open in append binary and write newline-delimited json
        try:
            # Bypass patched open() to ensure disk write
            import stat
            flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND | getattr(os, "O_BINARY", 0)
            fd = os.open(events_path, flags, 0o666)
            with os.fdopen(fd, "a", encoding="utf-8") as f: # usage of "a" matches O_APPEND
                for ev in ev_list:
                    f.write(json.dumps(ev, ensure_ascii=False) + "\n")
                f.flush()
                try:
                    os.fsync(f.fileno())
                except Exception: 
                    pass
        except Exception as e:
            print(f"[{os.getpid()}] [AgentTrace] failed to append events to {events_path}: {e}")
            import traceback
            traceback.print_exc()

    def _flush_events_to_disk(self):
        # wrapper for any buffered events (kept for safety)
        if self._events_mem:
            self._append_events_to_file(self._events_mem)
            self._events_mem = []

    def _next_sequence_number_from_file(self) -> int:
        if not self.trace_id:
            return 0
        events_path = os.path.join(self._trace_dir(self.trace_id), "events.jsonl")
        if not os.path.exists(events_path):
            return 0
            
        # SAFETY: Attempt repair first if file is corrupted
        self._recover_corrupted_events_file(events_path)

        # read last line quickly
        try:
            with open(events_path, "rb") as f:
                f.seek(0, os.SEEK_END)
                filesize = f.tell()
                # walk backwards until newline found
                step_back = 1024
                while True:
                    pos = max(0, filesize - step_back)
                    f.seek(pos)
                    chunk = f.read(min(step_back, filesize))
                    if b"\n" in chunk:
                        # parse last line
                        last_line = chunk.split(b"\n")[-2] if chunk.endswith(b"\n") else chunk.split(b"\n")[-1]
                        try:
                            last = json.loads(last_line.decode("utf-8"))
                            return last.get("seq", 0) + 1
                        except Exception:
                            return 0
                    if pos == 0:
                        # full small file
                        f.seek(0)
                        all_lines = f.read().splitlines()
                        if not all_lines:
                            return 0
                        try:
                            last = json.loads(all_lines[-1].decode("utf-8"))
                            return last.get("seq", 0) + 1
                        except Exception:
                            return 0
                    step_back *= 2
        except Exception:
            return 0
            
    def _recover_corrupted_events_file(self, path: str) -> None:
        """Truncate file to last valid newline if corruption detected"""
        try:
             with open(path, "rb+") as f:
                f.seek(0, os.SEEK_END)
                size = f.tell()
                if size == 0: return
                
                # Check last byte
                f.seek(-1, os.SEEK_END)
                if f.read(1) == b'\n':
                    return # Looks ok ending in newline
                
                # If not ending in newline, we might have partial write
                print(f"[AgentTrace] [WARN] Detected potential corruption/partial write in {path}. Attempting repair...")
                
                # Scan backwards for last newline
                f.seek(0, os.SEEK_END)
                # Simple recovery: truncate to last newline
                # (Production grade would be more sophisticated, but this prevents crashes)
                pos = size - 1
                while pos > 0:
                    f.seek(pos)
                    if f.read(1) == b'\n':
                        # Found valid end of previous line
                        f.seek(pos + 1)
                        f.truncate()
                        print(f"[AgentTrace] [OK] Repaired file by truncating to {pos+1}")
                        return
                    pos -= 1
                
                # If we got here, file has no newlines? Truncate everything? 
                # Or keep as is if it's just one line without newline.
                pass
        except Exception as e:
            print(f"[AgentTrace] Failed to repair corrupted file: {e}")

    # -----------------------
    # Replay helpers
    # -----------------------
    def _jump_to_step(self, target_step: int):
        """
        Jump to specific step using keyframe + pending restore state.
        """
        trace_dir = self._trace_dir(self.trace_id)
        # find nearest keyframe <= target
        nearest = None
        for s in sorted(self.keyframes.keys(), reverse=True):
            if s <= target_step:
                nearest = s
                break

        if nearest is None:
            print(f"[AgentTrace] no keyframe <= {target_step}; starting from beginning")
            self.replay_cursor = 0
            self._pending_restore_state = None
            return

        cp_path = self.keyframes.get(nearest)
        if not cp_path or not os.path.exists(cp_path):
            print(f"[AgentTrace] missing checkpoint file for step {nearest}")
            self.replay_cursor = 0
            self._pending_restore_state = None
            return

        cp = self.checkpoint_manager.load_checkpoint(self.trace_id, nearest)
        if cp is None:
            print(f"[AgentTrace] checkpoint load returned None for {nearest}")
            self.replay_cursor = 0
            self._pending_restore_state = None
            return

        print(f"[AgentTrace] loaded keyframe {nearest}, pending restore; fast-forwarding cursor to {target_step}")
        self._pending_restore_state = cp
        self.replay_cursor = target_step

    def get_next_replay_event(self, expected_type: Optional[str] = None) -> Optional[dict]:
        """
        When replaying, runtime calls this to obtain next payload.
        It returns the payload (with branch override applied) or None at EOF.
        """
        if self.mode != Mode.REPLAY:
            return None

        # read next event from disk by seeking the replay_cursor
        ev = self._read_event_by_seq(self.replay_cursor)
        if ev is None:
            return None

        if expected_type and ev.get("type") != expected_type:
            print(f"[AgentTrace] divergence: expected {expected_type} but found {ev.get('type')} at seq {ev.get('seq')}")

        payload = ev.get("payload")
        override = self.branch_overrides.get(ev.get("seq"))
        if override is not None:
            payload = override

        # advance cursor for next call
        self.replay_cursor += 1
        return payload

    def _read_event_by_seq(self, seq: int) -> Optional[dict]:
        """
        Sequential read from events.jsonl. Optimized to stream until seq is reached.
        For simplicity: read file line-by-line until matching seq.
        For big files you can optimize via an index or simple chunked reads.
        """
        path = os.path.join(self._trace_dir(self.trace_id), "events.jsonl")
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    ev = json.loads(line)
                    if ev.get("seq") == seq:
                        return ev
            return None
        except Exception as e:
            print(f"[AgentTrace] failed to read event {seq}: {e}")
            return None

    # -----------------------
    # Utility: keyframes + metadata
    # -----------------------
    def _save_keyframes(self):
        if not self.trace_id:
            return
        try:
            path = os.path.join(self._trace_dir(self.trace_id), "keyframes.json")
            _atomic_write(path, json.dumps({str(k): v for k,v in self.keyframes.items()}, ensure_ascii=False).encode("utf-8"))
        except Exception as e:
            print(f"[AgentTrace] failed to save keyframes: {e}")

    def _load_keyframes(self, trace_id: str) -> Dict[int, str]:
        path = os.path.join(self._trace_dir(trace_id), "keyframes.json")
        if not os.path.exists(path):
            return {}
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            return {int(k): v for k,v in raw.items()}
        except Exception as e:
            print(f"[AgentTrace] failed to load keyframes: {e}")
            return {}

    def _save_metadata(self):
        if not self.trace_id:
            return
        try:
            meta = {"script_path": self.script_path, "script_content": self.script_content, "created_at": _original_time()}
            path = os.path.join(self._trace_dir(self.trace_id), "metadata.json")
            _atomic_write(path, json.dumps(meta, ensure_ascii=False).encode("utf-8"))
        except Exception as e:
            print(f"[AgentTrace] failed to save metadata: {e}")

    def _update_final_metadata(self, trace_id: str, success: bool = True):
        """Update metadata.json with final duration, event count, and status."""
        try:
            path = os.path.join(self._trace_dir(trace_id), "metadata.json")
            if not os.path.exists(path):
                return
            
            with open(path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            
            # Update fields
            if self.start_time:
                meta["duration_s"] = time_module.time() - self.start_time
            
            meta["event_count"] = self._event_seq
            meta["status"] = "completed" if success else "failed"
            meta["host_info"] = {
                "platform": sys.platform,
                "python": sys.version.split()[0],
                "pid": os.getpid()
            }
            # Infer title from script path
            if self.script_path:
                meta["title"] = os.path.basename(self.script_path)
            
            _atomic_write(path, json.dumps(meta, ensure_ascii=False).encode("utf-8"))
        except Exception as e:
            print(f"[AgentTrace] failed to update final metadata: {e}")

    def _ensure_sync_worker_running(self):
        """Start background sync thread if not already running."""
        if not self.api_key or not self.trace_id:
            return

        with self._event_lock:
            if self._sync_thread is None or not self._sync_thread.is_alive():
                print("[AgentTrace] Starting cloud sync worker thread...")
                self._stop_sync.clear()
                self._sync_thread = threading.Thread(
                    target=self._cloud_sync_worker,
                    daemon=True,
                    name="AgentTraceSync"
                )
                self._sync_thread.start()
                self.last_flush_time = time_module.time()
                
                # Check for any previously unsent events
                threading.Thread(target=self._sync_failover_queue, daemon=True, name="AgentTraceFailover").start()

    def _load_metadata(self, trace_id: str) -> dict:
        path = os.path.join(self._trace_dir(trace_id), "metadata.json")
        if not os.path.exists(path):
            return {}
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[AgentTrace] failed to load metadata: {e}")
            return {}

    # -----------------------
    # Cloud Sync Workers
    # -----------------------
    def _cloud_sync_worker(self):
        """Background thread with adaptive batching to sync events to the Cloud API."""
        print("[AgentTrace] Cloud sync worker started")
        
        batch = []
        
        while not self._stop_sync.is_set() or not self._sync_queue.empty():
            try:
                # Collect events with timeout
                try:
                    event = self._sync_queue.get(timeout=0.5)
                    batch.append(event)
                    print(f"[AgentTrace] Debug: Sync worker got event from queue (Batch size: {len(batch)})")
                except queue.Empty:
                    pass  # No event, check flush conditions
                
                # Flush conditions:
                # 1. Batch is full
                # 2. Time-based flush (prevent data loss on crash)
                # 3. Shutdown signal (or queue empty but we're stopping)
                current_time = time_module.time()
                should_flush = (
                    len(batch) >= self.batch_size or
                    (len(batch) > 0 and (current_time - self.last_flush_time) >= self.batch_timeout) or
                    (self._stop_sync.is_set() and self._sync_queue.empty())
                )
                
                if should_flush and batch:
                    success = self._flush_batch(batch)
                    if success:
                        # Mark all as done
                        for _ in batch:
                            try:
                                self._sync_queue.task_done()
                            except ValueError:
                                pass
                        batch = []
                        self.last_flush_time = current_time
                    else:
                        # Retry failed batch once
                        print(f"[AgentTrace] Batch upload failed, retrying {len(batch)} events...")
                        time_module.sleep(1)
                        success = self._flush_batch(batch)
                        if success:
                            for _ in batch:
                                try:
                                    self._sync_queue.task_done()
                                except ValueError:
                                    pass
                            batch = []
                            self.last_flush_time = current_time
                        else:
                            # FAILOVER: Save to local disk instead of dropping
                            print(f"[AgentTrace] [ERROR] Sync failed after retries. Saving {len(batch)} events to local failover queue.")
                            self._append_to_failover(batch)
                            batch = []
            
            except Exception as e:
                print(f"[AgentTrace] Sync worker error: {e}")
                time_module.sleep(0.1)
        
        # Final flush on shutdown if anything remains
        if batch:
            self._flush_batch(batch)
        
        print("[AgentTrace] Cloud sync worker finished")

    def _flush_batch(self, events: List[Dict[str, Any]]) -> bool:
        """Upload batch of events to the plural events endpoint."""
        if not self.api_key or not self.trace_id:
            if not self.api_key: print("[AgentTrace] [WARN] Missing AGENTTRACE_API_KEY")
            if not self.trace_id: print("[AgentTrace] [WARN] Missing trace_id")
            return False
            
        try:
            url = f"{self.api_url}/sdk/trace/events"
            print(f"[AgentTrace] [SYNC] Syncing {len(events)} events to {url}...")
            resp = requests.post(
                url,
                json={
                    "trace_id": self.trace_id,
                    "events": [
                        {
                            "type": ev["type"],
                            "payload": ev["payload"],
                            "seq": ev["seq"],
                            "timestamp": ev.get("timestamp")
                        }
                        for ev in events
                    ]
                },
                headers={"X-API-Key": self.api_key},
                timeout=10
            )
            if not resp.ok:
                print(f"[AgentTrace] [ERROR] Sync failed: {resp.status_code} - {resp.text}")
            return resp.ok
        except Exception as e:
            print(f"[AgentTrace] [ERROR] Sync error: {e}")
            return False

    def _finalize_cloud_trace(self, trace_id: str, script_content: Optional[str], script_path: Optional[str]):
        """Call the /end endpoint to finalize trace and upload script."""
        content_str = None
        if script_content:
            content_str = script_content if isinstance(script_content, str) else script_content.decode("utf-8")
        elif script_path and os.path.exists(script_path):
            with open(script_path, "r", encoding="utf-8") as f:
                content_str = f.read()

        try:
            print(f"[AgentTrace] Finalizing cloud trace {trace_id[:8]}...")
            resp = requests.post(
                f"{self.api_url}/sdk/trace/end",
                json={
                    "trace_id": trace_id,
                    "status": "ok",
                    "script_content": content_str
                },
                headers={"X-API-Key": self.api_key},
                timeout=20
            )
            if resp.ok:
                print(f"[AgentTrace] [OK] Cloud trace finalized!")
            else:
                print(f"[AgentTrace] [WARN] Cloud finalization failed: {resp.status_code}")
        except Exception as e:
            print(f"[AgentTrace] [WARN] Cloud finalization error: {e}")

    def _upload_script_to_cloud(self, trace_id: str, script_content: Optional[str], script_path: Optional[str]):
        """Auto-upload script to cloud storage for Replay support.
        
        Tries API key auth first (simple), falls back to direct Supabase.
        """
        if not trace_id:
            return
        
        # Get script content
        content_str = None
        if script_content:
            content_str = script_content if isinstance(script_content, str) else script_content.decode("utf-8")
        elif script_path and os.path.exists(script_path):
            with open(script_path, "r", encoding="utf-8") as f:
                content_str = f.read()
        
        if not content_str:
            print(f"[AgentTrace] [WARN] No script content to upload for trace {trace_id[:8]}")
            return
        
        # Method 1: API Key auth (preferred - simple for users)
        api_key = os.environ.get("AGENTTRACE_API_KEY")
        api_url = os.environ.get("AGENTTRACE_API_URL", "https://moat-kappa.vercel.app/api")
        
        if api_key:
            try:
                # Method 1: API sync
                response = requests.post(
                   f"{api_url}/sdk/trace/end",
                    json={
                        "trace_id": trace_id,
                        "status": "completed",
                        "script_content": content_str
                    },
                    headers={"X-API-Key": api_key},
                    timeout=30
                )
                if response.ok:
                    print(f"[AgentTrace] [OK] Script synced to cloud via API ({trace_id[:8]})")
                    return
                else:
                    print(f"[AgentTrace] [WARN] API sync failed: {response.status_code}")
            except Exception as e:
                print(f"[AgentTrace] [WARN] API sync error: {e}")
        
        # Method 2: Direct Supabase (fallback)
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if supabase_url and supabase_key:
            try:
                from supabase import create_client
                client = create_client(supabase_url, supabase_key)
                
                content_bytes = content_str.encode("utf-8")
                dest_path = f"{trace_id}/script.py"
                
                try:
                    client.storage.from_("traces").upload(
                        dest_path, content_bytes, {"content-type": "text/x-python", "upsert": "true"}
                    )
                    print(f"[AgentTrace] [OK] Script uploaded to Supabase ({trace_id[:8]})")
                except Exception as upload_err:
                    if "already exists" in str(upload_err).lower():
                        client.storage.from_("traces").update(
                            dest_path, content_bytes, {"content-type": "text/x-python"}
                        )
                        print(f"[AgentTrace] [OK] Script updated in Supabase ({trace_id[:8]})")
                    else:
                        raise
            except ImportError:
                pass
            except Exception as e:
                print(f"[AgentTrace] [WARN] Supabase upload failed: {e}")

    def _upload_script_sync(self, script_content: str, timeout: int = 10) -> bool:
        """
        Synchronously upload script with timeout.
        Returns True on success, False on failure.
        """
        if not self.api_key:
            return False
            
        try:
            resp = requests.post(
                f"{self.api_url}/sdk/trace/script",
                json={
                    "trace_id": self.trace_id,
                    "script_content": script_content
                },
                headers={"X-API-Key": self.api_key},
                timeout=timeout
            )
            return resp.ok
        except Exception as e:
            print(f"[AgentTrace] Script upload error: {e}")
            return False

    # -----------------------
    # JSON cleaning
    # -----------------------
    def _detect_caller_script(self) -> Optional[str]:
        """
        Auto-detect the script that initiated tracing.
        Uses stack inspection to find the first non-agenttrace file.
        """
        import inspect
        
        try:
            # Walk up the stack to find caller
            for frame_info in inspect.stack():
                filename = frame_info.filename
                
                # Skip agenttrace internal files
                if "agenttrace" in filename:
                    continue
                
                # Skip Python stdlib
                if "site-packages" in filename or "lib/python" in filename:
                    continue
                
                # Skip interactive/temp files
                if filename in ("<stdin>", "<console>", "<string>"):
                    continue
                
                # Found the user's script!
                if filename.endswith(".py"):
                    return os.path.abspath(filename)
            
            return None
        except Exception as e:
            print(f"[AgentTrace] Failed to detect script: {e}")
            return None

    def _compute_event_hash(self, event: dict) -> str:
        """
        Compute deterministic hash of event content.
        Excludes timestamp and other metadata.
        """
        hashable = {
            "type": event["type"],
            "seq": event["seq"],
            "payload": event["payload"]  # Already cleaned by _make_deterministic
        }
        
        # Use sorted JSON for consistent hashing
        canonical = json.dumps(hashable, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(canonical.encode('utf-8')).hexdigest()[:16]  # First 16 chars

    # -----------------------
    # JSON cleaning
    # -----------------------
    def _make_deterministic(self, obj: Any) -> Any:
        """
        Remove all non-deterministic data from payloads.
        This ensures identical runs produce identical hashes.
        """
        if isinstance(obj, dict):
            cleaned = {}
            for k, v in obj.items():
                # Skip known non-deterministic fields
                if k in ("timestamp", "_timestamp", "id", "_id", "object_id", 
                         "process_id", "thread_id", "created_at", "updated_at",
                         "start_time", "end_time", "latency_ms", "latency", "duration", "duration_ms",
                         "pid", "time", "memory_usage", "checksum_payload", "content_hash"):
                    continue
                
                # Skip private attributes
                if k.startswith("_"):
                    continue
                
                cleaned[k] = self._make_deterministic(v)
            
            # Sort keys for consistent ordering
            return {k: cleaned[k] for k in sorted(cleaned.keys())}
        
        elif isinstance(obj, (list, tuple)):
            return [self._make_deterministic(x) for x in obj]
        
        elif isinstance(obj, str):
            import re
            # Remove memory addresses like "0x7f8b8c0d1e90"
            return re.sub(r'0x[0-9a-fA-F]+', '0x<ADDR>', obj)
        
        elif isinstance(obj, (int, float, bool, type(None))):
            return obj
        
        elif hasattr(obj, '__dict__'):
            # For custom objects, use their dict representation
            return self._make_deterministic(obj.__dict__)
        
        else:
            # For everything else, use string representation
            # but remove memory addresses
            s = str(obj)
            import re
            # Remove memory addresses like "0x7f8b8c0d1e90"
            return re.sub(r'0x[0-9a-fA-F]+', '0x<ADDR>', s)

    def _clean_for_json(self, obj: Any):
        if isinstance(obj, dict):
            out = {}
            for k, v in obj.items():
                if k.startswith("_"):
                    continue
                out[k] = self._clean_for_json(v)
            return out
        if isinstance(obj, (list, tuple)):
            return [self._clean_for_json(x) for x in obj]
        if isinstance(obj, (str, int, float, bool, type(None))):
            return obj
        try:
            s = str(obj)
            if len(s) > 1000:
                s = s[:1000] + "...(truncated)"
            return s
        except Exception:
            return f"<non-serializable:{type(obj).__name__}>"

    # -----------------------
    # pending restore
    # -----------------------
    def consume_pending_restore_state(self):
        with self._event_lock:
            state = self._pending_restore_state
            self._pending_restore_state = None
            return state

    # -----------------------
    def _append_to_failover(self, events: List[Dict[str, Any]]):
        """Save events to a local failover file to be synced later."""
        if not self.trace_id:
            return
        
        failover_path = os.path.join(self.storage_root, "unsent_events.jsonl")
        try:
            with open(failover_path, "a", encoding="utf-8") as f:
                for ev in events:
                    # Mark which trace this belongs to so we can sync it correctly later
                    ev["_trace_id"] = self.trace_id
                    f.write(json.dumps(ev, ensure_ascii=False) + "\n")
            print(f"[AgentTrace] [OK] Persisted {len(events)} events to {failover_path}")
        except Exception as e:
            print(f"[AgentTrace] [ERROR] Failed to write to failover queue: {e}")

    def _sync_failover_queue(self):
        """Attempt to sync any events stored in the failover queue."""
        failover_path = os.path.join(self.storage_root, "unsent_events.jsonl")
        if not os.path.exists(failover_path) or not self.api_key:
            return

        print(f"[AgentTrace] [SYNC] Checking failover queue: {failover_path}")
        try:
            # Read all lines
            with open(failover_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            if not lines:
                return

            # Group by trace_id
            groups: Dict[str, List[dict]] = {}
            for line in lines:
                try:
                    ev = json.loads(line)
                    tid = ev.pop("_trace_id", self.trace_id)
                    if tid not in groups: groups[tid] = []
                    groups[tid].append(ev)
                except:
                    continue
            
            # Try to sync each group
            remaining_lines = []
            for tid, group_events in groups.items():
                print(f"[AgentTrace] [SYNC] Attempting recovery for trace {tid[:8]} ({len(group_events)} events)")
                
                # Temporarily swap trace_id for flush_batch
                original_tid = self.trace_id
                self.trace_id = tid
                success = self._flush_batch(group_events)
                self.trace_id = original_tid

                if not success:
                    # Still failing, keep in queue
                    for ev in group_events:
                        ev["_trace_id"] = tid
                        remaining_lines.append(json.dumps(ev, ensure_ascii=False) + "\n")
            
            # Rewrite failover file with remaining events
            if len(remaining_lines) != len(lines):
                with open(failover_path, "w", encoding="utf-8") as f:
                    f.writelines(remaining_lines)
                
                if not remaining_lines:
                    print("[AgentTrace] [OK] Failover queue fully cleared.")
                else:
                    print(f"[AgentTrace] [INFO] Failover queue partially cleared ({len(remaining_lines)} remaining).")
                    
        except Exception as e:
            print(f"[AgentTrace] [ERROR] Failover recovery error: {e}")

    # Helpers for RNG capture (used by CheckpointManager)
    # -----------------------
    def capture_runtime_state(self) -> dict:
        """Return deterministic runtime state to be stored in keyframe"""
        rt = {}
        try:
            rt["py_random"] = _serialize_random_state()
        except Exception:
            rt["py_random"] = "<error>"
        if _HAS_NUMPY:
            try:
                rt["numpy_random"] = _np.random.get_state()
            except Exception:
                rt["numpy_random"] = "<error>"
        return rt

    def _update_final_metadata(self, trace_id: str, success: bool = True):
        """Update metadata.json with final duration, event count, and status."""
        try:
            path = os.path.join(self._trace_dir(trace_id), "metadata.json")
            if not os.path.exists(path):
                return
            
            with open(path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            
            # Update fields
            if getattr(self, "start_time", None):
                meta["duration_s"] = time_module.time() - self.start_time
            
            meta["event_count"] = self._event_seq
            meta["status"] = "completed" if success else "failed"
            meta["host_info"] = {
                "platform": sys.platform,
                "python": sys.version.split()[0],
                "pid": os.getpid()
            }
            # Infer title from script path
            if self.script_path:
                meta["title"] = os.path.basename(self.script_path)
            
            _atomic_write(path, json.dumps(meta, ensure_ascii=False).encode("utf-8"))
        except Exception as e:
            print(f"[AgentTrace] failed to update final metadata: {e}")
