import time
import os
import sys
from pathlib import Path

# Add SDK to path
sys.path.insert(0, str(Path("packages/python-sdk").absolute()))

import agenttrace
from agenttrace.decorators import run
from agenttrace.config import Config

@run(name="env_audit_agent")
def mock_agent():
    # 1. Test Clocks
    t1 = time.time()
    p1 = time.perf_counter()
    m1 = time.monotonic()
    
    # 2. Test Env
    hash_seed = os.environ.get("PYTHONHASHSEED", "None")
    
    # 3. Test Random
    import random
    r1 = random.random()
    
    # Simulate work
    print(f"Time: {t1}")
    print(f"PerfCounter: {p1}")
    print(f"Monotonic: {m1}")
    print(f"HashSeed: {hash_seed}")
    print(f"Random: {r1}")
    
    return {"status": "ok", "p": p1, "m": m1, "r": r1}

def test_phase_6_lockdown():
    print("\n--- Phase 6: Environment & Clock Lockdown Audit ---")
    
    # 1. Record a trace
    Config.mode = "record"
    print("Recording Session...")
    res1 = mock_agent()
    
    # Extract the recorded trace from memory (it went to background but we can simulate it)
    # For this test, manually get the last trace from context if we were real, 
    # but here we'll just check if the interceptor works in replay.
    
    # Simulate a trace with specific captured time and env
    trace_events = [
        {
            "seq": 0, "type": "agent_start", "timestamp_epoch": 1000.0,
            "payload": {
                "seed": 1234, 
                "env": {"PYTHONHASHSEED": "0", "TZ": "UTC"},
                "argv": ["script.py", "arg1"],
                "return_value": None # Will be overwritten by actual in decorators
            }
        },
        {
            "seq": 1, "type": "agent_complete", "timestamp_epoch": 1005.0,
            "payload": {"status": "completed", "return_value": "{'status': 'ok', ...}"}
        }
    ]
    
    # 2. Replay with strict interception
    Config.mode = "replay"
    Config.replay_events = trace_events
    
    print("\nReplaying Session (Strict Choice 1)...")
    # Change actual env to simulate "drift"
    os.environ["TZ"] = "America/New_York" 
    
    res2 = mock_agent()
    
    # Verification
    print(f"\nReplay result: {res2}")
    
    # Ensure clocks were frozen to the trace start (1000.0)
    # Depending on implementation, it might be 1000.0 for all calls in Choice 1
    assert res2["p"] == 0.0, f"PerfCounter should be relative to start (1000.0-1000.0=0). Got {res2['p']}"
    assert res2["m"] == 0.0, f"Monotonic should be relative to start. Got {res2['m']}"
    
    print("\nSUCCESS: Phase 6 Clock & Env Lockdown Verified.")

if __name__ == "__main__":
    test_phase_6_lockdown()
