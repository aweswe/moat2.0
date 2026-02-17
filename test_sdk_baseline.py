import sys
import os
from pathlib import Path

# Add the current directory to sys.path so we can import agenttrace
sys.path.insert(0, str(Path(__file__).parent))

# Manually load .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    with open(env_path, "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
    print(f"✅ Loaded .env from {env_path}")

from agenttrace.core.tracer import Tracer

def main():
    tracer = Tracer.get_instance()
    
    import uuid
    trace_id = os.environ.get("AGENTTRACE_TRACE_ID")
    if not trace_id:
        trace_id = str(uuid.uuid4())
        print(f"Starting baseline recording (Trace ID: {trace_id})...")
    else:
        print(f"Worker-driven recording (Trace ID: {trace_id})...")
        
    tracer.start_recording(
        script_path=__file__,
        trace_id=trace_id
    )
    
    tracer.thought("Initializing baseline test...")
    
    # Simulate some work
    for i in range(3):
        tracer.record_event("test_step", {"step": i, "status": "ok"})
        print(f"Step {i} recorded")
    
    tracer.thought("Test sequence complete.")
    tracer.stop()
    print("Trace stopped.")
    
    # Verify file existence (only if running locally, not in worker)
    if not os.environ.get("AGENTTRACE_TRACE_ID"):
        trace_path = Path(".agenttrace/traces") / trace_id / "events.jsonl"
        if trace_path.exists():
            print(f"SUCCESS: Trace saved to {trace_path}")
            with open(trace_path, "r") as f:
                lines = f.readlines()
                print(f"Events recorded: {len(lines)}")
        else:
            print("FAILED: Trace file not found.")

if __name__ == "__main__":
    main()
