import json
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import hashlib
from supabase import create_client

app = FastAPI(title="AgentTrace Execution Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_supabase_client():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    if url and not url.endswith("/"):
        url += "/"
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase environment variables not set")
    return create_client(url, key)

class BranchRequest(BaseModel):
    trace_id: str
    fork_step: int
    override: Optional[Dict[str, Any]] = None
    name: Optional[str] = None

class ReplayRequest(BaseModel):
    trace_id: str
    step: Optional[int] = None
    branch_id: Optional[str] = None

class ExecuteReplayRequest(BaseModel):
    trace_id: str
    branch_id: Optional[str] = None

# --- Internal Helpers ported from branch_handler.py and replay_handler.py ---

def download_events(client, trace_id: str) -> list:
    """
    Fetch events for a trace. Tries two sources:
    1. trace_events DB table (SDK-ingested traces via /api/trace/register)
    2. Supabase Storage events.jsonl (legacy CLI-ingested traces)
    """
    # --- Source 1: Database table (SDK path) ---
    try:
        res = client.table("trace_events").select("*").eq("trace_id", trace_id).order("seq").execute()
        if res.data and len(res.data) > 0:
            print(f"[Events] Loaded {len(res.data)} events from trace_events table for {trace_id}")
            return res.data
    except Exception as e:
        print(f"[Events] DB query failed: {e}")

    # --- Source 2: Storage file (legacy CLI path) ---
    try:
        blob = client.storage.from_("traces").download(f"{trace_id}/events.jsonl")
        if blob:
            text = blob.decode("utf-8") if isinstance(blob, (bytes, bytearray)) else blob
            events = []
            for line in text.splitlines():
                line = line.strip()
                if line:
                    try:
                        events.append(json.loads(line))
                    except Exception:
                        continue
            events.sort(key=lambda e: e.get("seq", 0))
            if events:
                print(f"[Events] Loaded {len(events)} events from Storage for {trace_id}")
                return events
    except Exception as e:
        print(f"[Events] Storage download failed: {e}")

    raise HTTPException(status_code=404, detail=f"No trace events found for trace {trace_id}")

def compute_hash(events: list, up_to_step: int) -> str:
    """SHA256 of events 0..up_to_step (deterministic, no timestamps)."""
    filtered = []
    for ev in events:
        seq = ev.get("seq", 0)
        if seq > up_to_step:
            break
        clean = {k: v for k, v in ev.items() if k != "timestamp"} # Omit volatile timestamp
        filtered.append(json.dumps(clean, sort_keys=True, separators=(",", ":")))
    content = "\n".join(filtered)
    return hashlib.sha256(content.encode()).hexdigest()

# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "agenttrace-execution-engine"}

@app.post("/branches/create")
def create_branch(req: BranchRequest):
    client = get_supabase_client()
    events = download_events(client, req.trace_id)
    
    parent_hash = compute_hash(events, req.fork_step)
    branch_name = req.name or f"fork-step-{req.fork_step}"
    branch_id = str(uuid.uuid4())
    
    fork_events = [e for e in events if e.get("seq", 0) <= req.fork_step]
    
    overrides_payload = {}
    if req.override:
        overrides_payload["_override"] = {str(req.fork_step): req.override}
    overrides_payload["_parent_hash"] = parent_hash
    overrides_payload["_fork_events_count"] = len(fork_events)
    
    res_trace = client.table("traces").select("org_id").eq("id", req.trace_id).execute()
    org_id = res_trace.data[0].get("org_id") if res_trace.data else None
    if not org_id:
        raise HTTPException(status_code=404, detail="Trace org_id not found")

    branch_record = {
        "id": branch_id,
        "trace_id": req.trace_id,
        "org_id": org_id,
        "fork_step": req.fork_step,
        "name": branch_name,
        "overrides": overrides_payload,
    }
    
    res = client.table("branches").insert(branch_record).execute()
    if not res.data:
         raise HTTPException(status_code=500, detail="Failed to insert branch into Supabase")
         
    return {
        "success": True,
        "branchId": res.data[0]["id"],
        "parentTraceId": req.trace_id,
        "forkStep": req.fork_step,
        "parentHash": parent_hash,
        "name": branch_name,
        "forkEventCount": len(fork_events),
    }

@app.get("/branches/list")
def list_branches(trace_id: str):
    client = get_supabase_client()
    res = client.table("branches").select("*").eq("trace_id", trace_id).order("created_at", desc=True).execute()
    
    normalized = []
    for b in res.data or []:
        overrides = b.get("overrides") or {}
        normalized.append({
            "id": b.get("id"),
            "parentTraceId": b.get("trace_id"),
            "forkStep": b.get("fork_step", 0),
            "name": b.get("name"),
            "parentHash": overrides.get("_parent_hash"),
            "createdAt": b.get("created_at"),
            "overridePayload": overrides.get("_override"),
        })
    return {"success": True, "branches": normalized}

@app.post("/replay/events")
def get_replay_events(req: ReplayRequest):
    """
    Hydrate events for the Multiverse View.
    Merges base events up to fork_step with branch overrides.
    """
    client = get_supabase_client()
    
    # 1. Handle Main Trace Replay (No Branch ID)
    if not req.branch_id:
        events = download_events(client, req.trace_id)
        return {
            "success": True,
            "events": events,
            "eventCount": len(events),
            "branchId": None,
            "forkStep": None
        }

    # 2. Handle Branch Replay

    branch_res = client.table("branches").select("*").eq("id", req.branch_id).execute()
    if not branch_res.data:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    branch = branch_res.data[0]
    fork_step = branch.get("fork_step", 0)
    overrides = branch.get("overrides", {}).get("_override", {})
    
    # 2. Get base events
    events = download_events(client, branch.get("trace_id"))
    
    # 3. Apply branch logic (Just the fork step + override for MVP, real executing sandbox goes here in Phase 5)
    branch_events = []
    
    for ev in events:
        seq = ev.get("seq", 0)
        evt_copy = dict(ev)
        
        # Mark events after the fork step as hypothetical branch events
        if seq > fork_step:
            evt_copy["_branched"] = True
        
        # If this is the fork step AND we have an override for it, patch the payload
        str_seq = str(seq)
        if str_seq in overrides and seq == fork_step:
            if "payload" in evt_copy and isinstance(evt_copy["payload"], dict):
                evt_copy["payload"].update(overrides[str_seq])
            else:
                 # Ensure flat structure matches depending on API version
                 evt_copy.update(overrides[str_seq])
                 
        branch_events.append(evt_copy)
        
    return {
        "success": True,
        "events": branch_events,
        "eventCount": len(branch_events),
        "branchId": branch.get("id"),
        "forkStep": fork_step
    }

@app.post("/replay/execute")
def execute_replay(req: ExecuteReplayRequest):
    """
    MVP Cloud Sandbox Strategy (Process-Level Isolation).
    Downloads the trace events and source code.
    Spawns a new python subprocess with strict constraints (timeout + ulimit).
    """
    import tempfile
    import subprocess
    import sys
    import json
    import os
    
    client = get_supabase_client()
    events = download_events(client, req.trace_id)
    
    # If a branch_id is provided, apply its override at the fork step
    branch_meta = None
    if req.branch_id:
        branch_res = client.table("branches").select("*").eq("id", req.branch_id).execute()
        if not branch_res.data:
            raise HTTPException(status_code=404, detail=f"Branch {req.branch_id} not found")
        
        branch = branch_res.data[0]
        fork_step = branch.get("fork_step", 0)
        overrides = branch.get("overrides", {}).get("_override", {})
        
        # Apply the override payload at the fork step
        branched_events = []
        for ev in events:
            seq = ev.get("seq", 0)
            evt_copy = dict(ev)
            str_seq = str(seq)
            
            if str_seq in overrides and seq == fork_step:
                # Inject the override into the event payload
                if "payload" in evt_copy and isinstance(evt_copy["payload"], dict):
                    evt_copy["payload"] = {**evt_copy["payload"], **overrides[str_seq]}
                else:
                    evt_copy.update(overrides[str_seq])
            
            # Mark events after fork step as hypothetical
            if seq > fork_step:
                evt_copy["_branched"] = True
                
            branched_events.append(evt_copy)
        
        events = branched_events
        branch_meta = {
            "branch_id": req.branch_id,
            "fork_step": fork_step,
            "name": branch.get("name"),
        }
        print(f"[Execution Engine] Branch mode: fork_step={fork_step}, overrides={overrides}")

    
    # 1. Fetch Source Code from original trace
    source_code = None
    try:
        # First try the database column (if it exists)
        res = client.table("traces").select("source_code").eq("id", req.trace_id).execute()
        source_code = res.data[0].get("source_code") if res.data else None
    except Exception as e:
        print(f"[Execution Engine] Could not read source_code column: {e}")
        
    if not source_code:
        # Fallback to Supabase Storage (where it is actually uploaded by the API)
        try:
            blob = client.storage.from_("traces").download(f"{req.trace_id}/script.py")
            if blob:
                source_code = blob.decode("utf-8") if isinstance(blob, (bytes, bytearray)) else blob
        except Exception as e:
            print(f"[Execution Engine] Could not download script.py from storage: {e}")
        
    if not source_code:
        raise HTTPException(status_code=400, detail="Trace does not contain recorded source code.")
        
    # 2. Setup the MVP Process Sandbox
    # We write the source code and the events memory file to /tmp
    # A real Phase 5 implementation will use Fly.io microVMs here.
    
    with tempfile.TemporaryDirectory() as temp_dir:
        events_file_path = os.path.join(temp_dir, "events.json")
        with open(events_file_path, "w") as f:
            json.dump({
                "events": events,
                "metadata": {
                    "trace_id": req.trace_id
                }
            }, f)
            
        # Write agent code
        agent_file_path = os.path.join(temp_dir, "agent.py")
        with open(agent_file_path, "w") as f:
            f.write(source_code)
            
        # Write Output target
        output_file_path = os.path.join(temp_dir, "new_trace.json")
            
        # Add the backend directory itself to PYTHONPATH so the bundled `agenttrace` is importable
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        python_path = os.environ.get("PYTHONPATH", "")
        if python_path:
            python_path = f"{backend_dir}:{python_path}" if os.name != 'nt' else f"{backend_dir};{python_path}"
        else:
            python_path = backend_dir

        sandbox_env = {
            "AGENTTRACE_MODE": "replay",
            "AGENTTRACE_GOVERNANCE_LEVEL": "governance" if branch_name == "main" else "relaxed",
            "AGENTTRACE_REPLAY_EVENTS_FILE": events_file_path,
            "AGENTTRACE_REPLAY_OUTPUT_FILE": output_file_path,
            "PYTHONPATH": python_path # ensure bundled agenttrace SDK is visible
        }
        
        try:
            if os.name == 'nt':
                # Windows: MVP Process Sandbox (Timeouts only, no ulimit)
                proc = subprocess.run(
                    [sys.executable, agent_file_path],
                    env=sandbox_env,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
            else:
                # Unix: OS-level limits script for the subprocess (ulimit)
                run_script_path = os.path.join(temp_dir, "run.sh")
                with open(run_script_path, "w") as f:
                    f.write(f"""#!/bin/bash
# MVP Process Sandbox Restrictions
ulimit -v 262144  # Limit memory to ~256MB
ulimit -f 10000   # Limit max file size
{sys.executable} {agent_file_path}
""")
                os.chmod(run_script_path, 0o755)
    
                # Execute with hard 30s timeout limit
                proc = subprocess.run(
                    ["/bin/bash", run_script_path],
                    env=sandbox_env,
                    capture_output=True,
                    text=True,
                    timeout=30
                ) # TODO: drop user privileges to nobody
            
            # Read back generated trace
            new_events = []
            if os.path.exists(output_file_path):
                 with open(output_file_path, "r") as f:
                     trace_data = json.load(f)
                     new_events = trace_data.get("events", [])
                     
            # Compute semantic behavioral fingerprint
            import hashlib
            # Normalize outputs to avoid false positives on whitespace
            semantic_stdout = "\n".join([line.strip() for line in proc.stdout.splitlines() if line.strip()])
            semantic_stderr = "\n".join([line.strip() for line in proc.stderr.splitlines() if line.strip()])
            
            # Find return value from the trace events
            return_value = None
            for evt in new_events:
                if evt.get("type") == "agent_complete":
                    return_value = evt.get("payload", {}).get("return_value")
                    break

            fingerprint_data = {
                "events": [{k: v for k, v in e.items() if k != "timestamp"} for e in events],
                "stdout": semantic_stdout,
                "stderr": semantic_stderr,
                "exit_code": proc.returncode,
                "return_value": return_value
            }
            
            fingerprint_payload = json.dumps(
                fingerprint_data,
                sort_keys=True, separators=(",", ":")
            )
            replay_fingerprint = hashlib.sha256(fingerprint_payload.encode()).hexdigest()

            return {
                "success": True,
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "exit_code": proc.returncode,
                "events_consumed": len(events),
                "replay_fingerprint": replay_fingerprint,
                "branch": branch_meta,
                "new_events": new_events if new_events else events
            }
            
        except subprocess.TimeoutExpired as e:
            return {
                "success": False,
                "error": "TimeoutExpired",
                "message": f"Agent exceeded 30s maximum execution sandbox limit.\n\nPartial Stdout:\n{e.stdout}\n\nStderr:\n{e.stderr}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": "SandboxExecutionFailed",
                "message": str(e)
            }
