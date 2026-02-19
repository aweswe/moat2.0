import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, os.getcwd())
from agenttrace.core.tracer import Tracer
from agenttrace.vfs.patch import patch_io

def run_divergence_demo():
    tracer = Tracer.get_instance()
    tracer.storage_root = ".agenttrace_test"
    
    parent_id = str(uuid.uuid4())
    print(f"1. Recording PARENT trace: {parent_id}")
    tracer.start_recording(trace_id=parent_id, script_path=__file__, skip_instrumentation=True)
    with patch_io():
        with open("demo.txt", "w") as f:
            f.write("Line A")
        with open("demo.txt", "w") as f:
            f.write("Line B")
    tracer.stop()
    
    child_id = str(uuid.uuid4())
    print(f"2. Recording DIVERGENT trace: {child_id} (parent: {parent_id})")
    # Simulate a "Replay + Record" where logic changed
    tracer.source_trace_id = parent_id
    tracer.trace_id = child_id
    # Mocking parent link in DB update
    os.environ["AGENTTRACE_PARENT_TRACE_ID"] = parent_id
    
    tracer.start_recording(trace_id=child_id, script_path=__file__, skip_instrumentation=True)
    with patch_io():
        with open("demo.txt", "w") as f:
            f.write("Line A")
        with open("demo.txt", "w") as f:
            f.write("Line DIVERGED") # Changed Line B to Line DIVERGED
    
    # Manually patch parent_id for the demo
    tracer._register_trace_in_supabase(__file__)
    
    tracer.stop()
    print(f"Done! Open dashboard at /dashboard/traces/{child_id}")

if __name__ == "__main__":
    run_divergence_demo()
