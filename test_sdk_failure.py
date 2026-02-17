import sys
import os
from pathlib import Path
import uuid

# Add the moat directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Manually load .env
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val

from agenttrace.core.tracer import Tracer

def main():
    tracer = Tracer.get_instance()
    trace_id = os.environ.get("AGENTTRACE_TRACE_ID") or str(uuid.uuid4())
    
    print(f"Starting failing record (Trace ID: {trace_id})...")
    tracer.start_recording(
        script_path=__file__,
        trace_id=trace_id
    )
    
    tracer.thought("Executing potentially failing code...")
    
    # Purposeful failure
    data = {"items": [1, 2, 3]}
    print(f"Accessing item at index 10...")
    target = data["items"][10] # This will raise IndexError
    
    print(f"Result: {target}")
    
    tracer.stop()

if __name__ == "__main__":
    main()
