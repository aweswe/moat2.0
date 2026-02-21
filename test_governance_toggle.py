import json
import os
import subprocess
import time
from typing import Optional

def run_replay_test(governance_level: Optional[str] = None):
    print(f"\n--- Testing with governance_level: {governance_level} ---")
    
    # We use a trace ID that we know exists or simulate one
    # For this test, we'll hit the logic in main.py directly if possible or use a mock request
    
    # Let's create a dummy agent script that tries to read a file
    with open("temp_leak_agent.py", "w") as f:
        f.write(f"""
import sys
import os

# Clean up path to ensure SDK is first and root is NOT there
sdk_root = {repr(os.path.abspath("packages/python-sdk"))}
sys.path = [sdk_root] + [p for p in sys.path if p != os.getcwd()]

import agenttrace
print(f"DEBUG: agenttrace file: {{agenttrace.__file__}}")
print(f"DEBUG: agenttrace content: {{dir(agenttrace)}}")

@agenttrace.run(name="leak_test")
def main():
    try:
        print("Agent: Checking for README.md...")
        # This should be a warning in relaxed, error in governance
        with open("packages/python-sdk/README.md", "r") as f:
            content = f.read(10)
        print(f"Agent: Success! Read {{content}}")
    except Exception as e:
        print(f"Agent: FAILED! {{type(e).__name__}}: {{e}}", file=sys.stderr)

if __name__ == "__main__":
    main()
""")

    # We need a mock events.json file too
    dummy_events = [
        {"seq": 0, "type": "agent_start", "payload": {"agent": "leak_test", "seed": 42}},
        {"seq": 1, "type": "agent_complete", "payload": {"status": "completed"}}
    ]
    with open("temp_events.json", "w") as f:
        json.dump({"events": dummy_events}, f)

    # Setup the environment like main.py would
    env = os.environ.copy()
    env["AGENTTRACE_MODE"] = "replay"
    env["AGENTTRACE_REPLAY_EVENTS_FILE"] = os.path.abspath("temp_events.json")
    # Point to the actual SDK source
    env["PYTHONPATH"] = os.path.abspath("packages/python-sdk")
    
    if governance_level:
        env["AGENTTRACE_GOVERNANCE_LEVEL"] = governance_level
    else:
        # Default fallback logic test
        env.pop("AGENTTRACE_GOVERNANCE_LEVEL", None)

    # Run the agent
    proc = subprocess.run(
        ["python", "temp_leak_agent.py"],
        env=env,
        capture_output=True,
        text=True
    )
    
    print("--- STDOUT ---")
    print(proc.stdout)
    print("--- STDERR ---")
    print(proc.stderr)
    
    if governance_level == "governance":
        if "Sandbox Violation" in proc.stderr or "DeterminismLeakError" in proc.stderr or "Agent: FAILED" in proc.stdout:
            print("✅ SUCCESS: Governance Mode correctly BLOCKED the leak.")
        else:
            print("❌ FAILURE: Governance Mode allowed the leak!")
    else:
        if "WARNING: Causal Leak Detected" in proc.stdout and "Agent: Success" in proc.stdout:
            print("✅ SUCCESS: Relaxed Mode correctly WARNED and ALLOWED the leak.")
        else:
            print("❌ FAILURE: Relaxed Mode behavior incorrect.")

if __name__ == "__main__":
    # Test Relaxed
    run_replay_test(governance_level="relaxed")
    # Test Governance
    run_replay_test(governance_level="governance")
    
    # Cleanup
    for f in ["temp_leak_agent.py", "temp_events.json"]:
        if os.path.exists(f):
            os.remove(f)
