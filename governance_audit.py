import os
import sys
import time
from pathlib import Path

# Add SDK to path
sys.path.insert(0, str(Path("packages/python-sdk").absolute()))

import agenttrace
from agenttrace.decorators import run
from agenttrace.config import Config
from agenttrace.interceptor import DeterminismLeakError

@run(name="governance_agent")
def governance_agent():
    print("[Agent] Starting adversarial leakage tests...")
    
    # 1. Check Clocks
    p1 = time.process_time()
    t1 = time.thread_time()
    print(f"[Agent] Clocks: Process={p1}, Thread={t1}")

    # 2. FILE SYSTEM ATTACK
    print("[Agent] Testing File System Lockdown...")
    try:
        with open("packages/python-sdk/README.md", "r") as f:
            pass
        raise Exception("FAIL: File I/O allowed!")
    except DeterminismLeakError:
        print("[Agent] SUCCESS: File I/O blocked.")

    # 3. ENTROPY ATTACK
    print("[Agent] Testing Entropy Lockdown...")
    try:
        os.urandom(16)
        raise Exception("FAIL: os.urandom allowed!")
    except DeterminismLeakError:
        print("[Agent] SUCCESS: Entropy leak blocked.")

    # 4. SECRETS ATTACK
    print("[Agent] Testing Secrets Lockdown...")
    try:
        import secrets
        secrets.token_hex(16)
        raise Exception("FAIL: secrets allowed!")
    except DeterminismLeakError:
        print("[Agent] SUCCESS: Secrets leak blocked.")

    # 5. SUBPROCESS ATTACK
    print("[Agent] Testing Subprocess Lockdown...")
    try:
        import subprocess
        subprocess.run(["echo", "leak"], capture_output=True)
        raise Exception("FAIL: subprocess allowed!")
    except DeterminismLeakError:
        print("[Agent] SUCCESS: Subprocess leak blocked.")

    return {"status": "governed", "p": p1, "t": t1}

def test_causal_lockdown():
    print("\n--- Phase 7: Governance Tier Causal Lockdown Audit ---")
    
    # Trace for a 2-step execution
    trace_events = [
        {
            "seq": 0, "type": "agent_start", "timestamp_epoch": 5000.0,
            "payload": {"seed": 777, "env": {"TZ": "UTC"}, "argv": []}
        },
        {
            "seq": 1, "type": "agent_complete", "timestamp_epoch": 5001.0,
            "payload": {"status": "completed"}
        }
    ]
    
    Config.mode = "replay"
    Config.replay_events = trace_events

    print("\n[Audit] Triggering Governed Agent...")
    res = governance_agent()
    
    # Verify clocks were relative to start (5000.0)
    assert res["p"] == 0.0, f"ProcessTime drift: {res['p']}"
    assert res["t"] == 0.0, f"ThreadTime drift: {res['t']}"

    print("\nSUCCESS: AgentTrace Governance Tier technically enforced.")

if __name__ == "__main__":
    test_causal_lockdown()
