import sys
import os
import json

# Force import from the SDK package
sdk_root = os.path.abspath("packages/python-sdk")
sys.path = [sdk_root] + [p for p in sys.path if p != os.getcwd()]

import agenttrace
from agenttrace.config import Config

@agenttrace.run(name="simple_agent")
def main():
    print("Agent is doing some work...")
    return {"status": "success", "data": "hello world"}

if __name__ == "__main__":
    print("--- RECORD MODE ---")
    Config.setup(mode="record")
    main()
    
    # The trace should be saved to .traces or similar? We need to intercept the trace.
    # Actually AgentTraceClient.send_trace might not work if we don't have an API key.
    # Let's mock AgentTraceClient.send_trace to capture the trace in memory.
    
    import agenttrace.client
    original_send = agenttrace.client.AgentTraceClient.send_trace
    
    recorded_trace = {}
    def mock_send_trace(trace_data):
        global recorded_trace
        recorded_trace = dict(trace_data)
        
    agenttrace.client.AgentTraceClient.send_trace = mock_send_trace
    
    print("Running agent to record...")
    main()
    
    events = recorded_trace.get("events", [])
    print(f"Recorded {len(events)} events.")
    
    events_file = "temp_clean_events.json"
    with open(events_file, "w") as f:
        json.dump(events, f)
        
    print("\n--- REPLAY MODE (GOVERNANCE) ---")
    os.environ["AGENTTRACE_MODE"] = "replay"
    os.environ["AGENTTRACE_REPLAY_EVENTS_FILE"] = os.path.abspath(events_file)
    os.environ["AGENTTRACE_GOVERNANCE_LEVEL"] = "governance"
    
    # We need a new python process to get a clean environment and config
    import subprocess
    env = os.environ.copy()
    env["PYTHONPATH"] = sdk_root
    
    with open("temp_replay_agent.py", "w") as f:
        f.write(f"""
import sys
import os
sys.path.insert(0, {repr(sdk_root)})
import agenttrace

@agenttrace.run(name="simple_agent")
def main():
    print("Agent is doing some work...")
    return {{"status": "success", "data": "hello world"}}

if __name__ == "__main__":
    main()
""")

    print("Running replay process...")
    proc = subprocess.run(
        ["python", "temp_replay_agent.py"],
        env=env,
        capture_output=True,
        text=True
    )
    
    print("--- REPLAY STDOUT ---")
    print(proc.stdout)
    print("--- REPLAY STDERR ---")
    print(proc.stderr)
    
    print("\nLet's print the original recorded events to see what might have changed:")
    print(json.dumps(events, indent=2))
    
    # Cleanup
    if os.path.exists(events_file):
        os.remove(events_file)
    if os.path.exists("temp_replay_agent.py"):
        os.remove("temp_replay_agent.py")
