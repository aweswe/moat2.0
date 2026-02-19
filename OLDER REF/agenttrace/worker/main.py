
import os
import sys
import time
import json
import uuid
import signal
import random
import traceback
from typing import Optional, Dict, Any

# Load env vars
try:
    from dotenv import load_dotenv
    load_dotenv("frontend/.env.local") # Priority: Frontend config
    load_dotenv(".env.local") 
    load_dotenv() 
except ImportError:
    pass

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

# Configuration
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://wddxzszcjturywfzjxjy.supabase.co")

# supabase_key logic
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
IS_SERVICE = bool(SUPABASE_KEY)
if not SUPABASE_KEY:
    SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

class AgentWorker:
    def __init__(self):
        self.worker_id = str(uuid.uuid4())
        self.running = True
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        mode = "SERVICE_ROLE ⚡" if IS_SERVICE else "ANON (RLS Restricted) ⚠️"
        print(f"[Worker] Initialized ID={self.worker_id[:8]} Mode={mode}")
        
    def run(self):
        print(f"[Worker] Connected to {SUPABASE_URL}")
        print("[Worker] Waiting for jobs...")
        
        # FIX 3.3: Exponential backoff for idle/error periods
        consecutive_idle = 0
        BACKOFF_DELAYS = [1, 2, 4, 8, 16, 30]  # Seconds
        
        while self.running:
            try:
                job = self._claim_job()
                if job:
                    consecutive_idle = 0  # Reset on successful claim
                    self._process_job(job)
                else:
                    consecutive_idle += 1
                    # Calculate delay with exponential backoff
                    delay_idx = min(consecutive_idle - 1, len(BACKOFF_DELAYS) - 1)
                    delay = BACKOFF_DELAYS[delay_idx] if consecutive_idle > 1 else 1
                    delay += random.uniform(0, 0.5)  # Add jitter
                    time.sleep(delay)
            except KeyboardInterrupt:
                print("\n[Worker] Shutting down...")
                self.running = False
            except Exception as e:
                print(f"[Worker] Error in loop: {e}")
                consecutive_idle += 1
                time.sleep(5)
        
        print(f"[Worker] Exiting main loop - running={self.running}")

    def _claim_job(self) -> Optional[Dict]:
        """
        Optimistic locking to claim a job.
        1. List recent jobs (broad query).
        2. Filter in Python (robust).
        3. Attempt to update it to 'processing'.
        """
        try:
            print(".", end="", flush=True)
            # Fetch recent jobs regardless of status (limit 10)
            res = self.client.table("jobs").select("id, status, created_at").order("created_at", desc=True).limit(10).execute()
            
            target_id = None
            found_status = None
            
            if res.data:
                # print(f"[DEBUG] Saw {len(res.data)} jobs: {[j['status'] for j in res.data]}")
                for job in res.data:
                    s = job.get("status")
                    # print(f"Checking {job['id']} status='{s}'")
                    # Robust check
                    if s and s.strip().lower() in ["queued", "pending"]:
                        target_id = job["id"]
                        found_status = s
                        print(f"[DEBUG] Found candidate {target_id} ({found_status})")
                        break
            else:
                 print("x", end="", flush=True) # Empty
            
            if not target_id:
                return None
            
            # 2. Claim (Force by ID)
            # print(f"[DEBUG] Attempting force claim on {target_id}")
            # Try 'running' to satisfy potential check constraint
            # Try 'running' to satisfy potential check constraint
            claim_res = self.client.table("jobs").update({
                "status": "running", 
                "worker_id": self.worker_id,
                "started_at": datetime_now_iso()
            }).eq("id", target_id).execute()
            
            # Since .execute() might not return data without select(), we assume success if no error?
            # Or we can re-fetch to verify.
            # But let's check .data if available.
            if claim_res.data:
                print(f"[Worker] Claimed job {target_id}")
                return claim_res.data[0]
            
            # If no data returned, re-fetch to confirm ownership
            verify = self.client.table("jobs").select("id, worker_id, status, type, trace_id, payload").eq("id", target_id).single().execute()
            if verify.data and verify.data["worker_id"] == self.worker_id:
                 print(f"[Worker] Claimed job {target_id} (Verified)")
                 return verify.data
            
            return None
                
        except Exception as e:
            print(f"[Worker] Claim error: {e}")
            return None

    def _process_job(self, job: Dict):
        job_id = job["id"]
        trace_id = job.get("trace_id")
        print(f"[Worker] Processing job {job_id} (Trace={trace_id})...")
        
        # PHASE 2 FIX: Reset global patch state to prevent leakage between jobs
        try:
            from agenttrace.instrumentation.patch import reset_patch_state
            reset_patch_state()
        except ImportError:
            pass
        
        if not trace_id:
             print("[Worker] Aborting: No trace_id found in job payload.")
             # Mark failed
             self.client.table("jobs").update({"status": "failed", "result": {"error": "Missing trace_id"}}).eq("id", job_id).execute()
             return

        try:
            # Get parent_trace_id for fallback
            payload = job.get("payload", {})
            parent_trace_id = job.get("parent_trace_id") or payload.get("parent_trace_id")
            
            # 1. Download Script with Parent Fallback
            print(f"[Worker] Fetching script.py for {trace_id}...")
            script_content = None
            
            # Try current trace first
            try:
                res = self.client.storage.from_("traces").download(f"{trace_id}/script.py")
                script_content = res
                print(f"[Worker] ✓ Script found in current trace ({len(res)} bytes)")
            except Exception as e:
                print(f"[Worker] Script not in current trace: {e}")
            
            # If not found and parent exists, try parent trace
            if script_content is None and parent_trace_id:
                print(f"[Worker] Trying parent trace {parent_trace_id}...")
                try:
                    res = self.client.storage.from_("traces").download(f"{parent_trace_id}/script.py")
                    script_content = res
                    print(f"[Worker] ✓ Script found in parent trace ({len(res)} bytes)")
                except Exception as e:
                    print(f"[Worker] Script not in parent trace: {e}")
            
            # If still no script, fail the job clearly
            if script_content is None:
                raise Exception(f"No script.py found in trace {trace_id} or parent {parent_trace_id}")

            # 1b. Check for existing events (e.g. from Fork or Resume)
            # If events.jsonl exists in storage, download it so Tracer can append
            try:
                print(f"[Worker] Checking for existing events.jsonl...")
                local_trace_dir = os.path.join(".agenttrace/traces", trace_id)
                os.makedirs(local_trace_dir, exist_ok=True)
                local_events_path = os.path.join(local_trace_dir, "events.jsonl")
                
                try:
                    events_res = self.client.storage.from_("traces").download(f"{trace_id}/events.jsonl")
                    if events_res:
                        with open(local_events_path, "wb") as f:
                            f.write(events_res)
                        print(f"[Worker] Downloaded existing events.jsonl ({len(events_res)} bytes)")
                except Exception:
                    # File not found or error, likely a new clean trace
                    pass
            except Exception as e:
                print(f"[Worker] Warning checking events: {e}")

            # 2. Setup Env
            import tempfile
            import importlib.util
            import sys
            from agenttrace.core.tracer import Tracer
            from agenttrace.instrumentation.patch import apply_patches

            # Function to apply patches
            apply_patches()


            # Create temp dir
            with tempfile.TemporaryDirectory() as temp_dir:
                script_path = os.path.join(temp_dir, "user_script.py")
                
                # Check for script override in payload (for Simulate/Auto-Fix)
                payload = job.get("payload", {})
                overrides = payload.get("overrides", {})
                # Also check input_overrides for backward compat or direct jobs
                if not overrides:
                    overrides = job.get("input_overrides", {})

                if overrides and "main.py" in overrides:
                    print("[Worker] Applying 'main.py' override from payload/overrides")
                    with open(script_path, "w", encoding="utf-8") as f:
                        f.write(overrides["main.py"])
                else:
                    with open(script_path, "wb") as f:
                        f.write(script_content)
                
                # 3. Setup Tracer
                t = Tracer.get_instance()
                # Force storage to local .agenttrace so we can find the file easily
                t.storage_root = ".agenttrace/traces" 

                # Extract fork parameters from job payload
                fork_step = payload.get("fork_step")
                event_override = payload.get("event_override")
                # Multi-tool overrides
                event_overrides = payload.get("overrides")
                
                # Parse fork_step to int
                parsed_fork_step = None
                if fork_step is not None:
                    try:
                        parsed_fork_step = int(fork_step)
                        print(f"[Worker] Fork job detected: step={parsed_fork_step}")
                    except ValueError:
                        print(f"[Worker] Invalid fork_step: {fork_step}")
                
                # Use ATOMIC start_recording API - fork_step and event_override are applied inside
                # This prevents any race conditions or accidental resets
                t.start_recording(
                    trace_id=trace_id, 
                    script_path=script_path,
                    fork_step=parsed_fork_step,
                    event_override=event_override,
                    event_overrides=event_overrides
                )
                t.record_event("trace_start", {"worker_id": self.worker_id})

                
                status = "completed"
                error_msg = None
                traceback_info = None

                # 4. Execute with subprocess sandboxing
                print("[Worker] Executing script...")
                
                # Enable subprocess sandbox to prevent shell escapes
                _sandbox_active = False
                try:
                    from agenttrace.vfs.subprocess_patch import enable_sandbox, disable_sandbox
                    enable_sandbox()
                    _sandbox_active = True
                except ImportError:
                    pass  # Module not available, skip sandbox
                
                try:
                    spec = importlib.util.spec_from_file_location("__main__", script_path)
                    mod = importlib.util.module_from_spec(spec)
                    mod.__name__ = "__main__"  # Ensure if __name__ == "__main__" blocks run
                    sys.modules["__main__"] = mod
                    spec.loader.exec_module(mod)
                    
                    if hasattr(mod, "main"):
                        import asyncio
                        if asyncio.iscoroutinefunction(mod.main):
                             asyncio.run(mod.main())
                        else:
                             # Handle case where main() returns a coroutine but isn't defined with async def (rare but possible)
                             res = mod.main()
                             if asyncio.iscoroutine(res):
                                 asyncio.run(res)

                except SystemExit as exit_err:
                    # User script called sys.exit() - this is normal, don't crash the worker
                    exit_code = exit_err.code if exit_err.code is not None else 0
                    print(f"[Worker] Script exited with code {exit_code}")
                    if exit_code != 0:
                        status = "failed"
                        error_msg = f"Script exited with code {exit_code}"
                except Exception as exec_err:
                    print(f"[Worker] Script Exception: {exec_err}")
                    t.exception("Script Crash", exec_err) # capture in trace
                    status = "failed"
                    error_msg = str(exec_err)
                    traceback_info = traceback.format_exc()  # Capture full traceback
                finally:
                    # Always disable sandbox after execution
                    if _sandbox_active:
                        try:
                            from agenttrace.vfs.subprocess_patch import disable_sandbox
                            disable_sandbox()
                        except ImportError:
                            pass
                    t.stop()
                    # Don't remove __main__ as it may break things
                
                # 5. Upload Artifacts (events.jsonl)
                local_events = os.path.join(".agenttrace/traces", trace_id, "events.jsonl")
                if os.path.exists(local_events):
                    file_size = os.path.getsize(local_events)
                    print(f"[Worker] Uploading events ({file_size} bytes)...")
                    try:
                        with open(local_events, "rb") as f:
                            up_res = self.client.storage.from_("traces").upload(
                                f"{trace_id}/events.jsonl",
                                f,
                                file_options={"content-type": "text/plain", "upsert": "true"}
                            )
                        print(f"[Worker] ✅ Upload success: {up_res}")
                    except Exception as up_err:
                        print(f"[Worker] ❌ Upload failed: {up_err}")
                else:
                    print(f"[Worker] Warning: No events.jsonl found at {local_events}")

                # 6. Complete Job
                result = {
                    "worker": self.worker_id,
                    "error": error_msg,
                    "events_uploaded": os.path.exists(local_events)
                }
                
                self.client.table("jobs").update({
                    "status": status,
                    "result": result,
                    "completed_at": datetime_now_iso()
                }).eq("id", job_id).execute()
                
                print(f"[Worker] Done {job_id} ({status})")

                # 7. Trigger AFE Analysis on Failure
                if status == "failed" and error_msg:
                    print(f"[Worker] Triggering AFE analysis...")
                    try:
                        from agenttrace.afe.detector import AFEDetector
                        detector = AFEDetector(self.client)
                        detector.detect_failure(
                            job_id=job_id,
                            trace_id=trace_id,
                            error_details=error_msg,
                            traceback_str=traceback_info,
                            events_path=local_events
                        )
                        if detector.last_detection_id:
                            print(f"[Worker] ✅ AFE complete (detection: {detector.last_detection_id})")
                        else:
                            print(f"[Worker] ⚠️ AFE completed but no detection ID returned")
                    except Exception as afe_err:
                        print(f"[Worker] ⚠️ AFE failed (non-fatal): {afe_err}")
                        traceback.print_exc()

        except Exception as e:
            print(f"[Worker] Infrastructure Error: {e}")
            self.client.table("jobs").update({
                "status": "failed",
                "error": str(e),
                "completed_at": datetime_now_iso()
            }).eq("id", job_id).execute()

def datetime_now_iso():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AgentTrace Worker")
    parser.add_argument("--realtime", action="store_true", 
                        help="Use Supabase Realtime instead of polling")
    args = parser.parse_args()
    
    if args.realtime:
        # Use realtime worker
        print("[Worker] Starting in REALTIME mode...")
        import asyncio
        from agenttrace.worker.realtime import main as realtime_main
        asyncio.run(realtime_main())
    else:
        # Use polling worker (default)
        print("[Worker] Starting in POLLING mode...")
        worker = AgentWorker()
        def handler(signum, frame):
            worker.running = False
        signal.signal(signal.SIGINT, handler)
        signal.signal(signal.SIGTERM, handler)
        
        worker.run()
