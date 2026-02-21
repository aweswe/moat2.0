import os
import sys
import time
from pathlib import Path

# Add SDK to path
sys.path.insert(0, str(Path("packages/python-sdk").absolute()))

import agenttrace
from agenttrace.decorators import run
from agenttrace.config import Config

@run(name="relaxed_agent")
def relaxed_agent():
    print("[Agent] Starting relaxed checks...")
    
    # 1. FILE SYSTEM (Should work but warn)
    print("[Agent] Attempting File I/O...")
    try:
        with open("packages/python-sdk/README.md", "r") as f:
            content = f.read(10)
        print(f"[Agent] File I/O Success (Content: {content})")
    except Exception as e:
        print(f"[Agent] File I/O FAILED: {e}")

    # 2. ENTROPY (Should work but warn)
    print("[Agent] Attempting Entropy...")
    try:
        import secrets
        tok = secrets.token_hex(4)
        print(f"[Agent] Entropy Success: {tok}")
    except Exception as e:
        print(f"[Agent] Entropy FAILED: {e}")

    return {"status": "relaxed"}

def test_relaxed_mode():
    print("\n--- Phase 8: Relaxed Mode (Developer Flow) Audit ---")
    
    trace_events = [
        {
            "seq": 0, "type": "agent_start", "timestamp_epoch": 1000.0,
            "payload": {"seed": 123, "env": {}, "argv": []}
        },
        {
            "seq": 1, "type": "agent_complete", "timestamp_epoch": 1001.0,
            "payload": {"status": "completed"}
        }
    ]
    
    Config.mode = "replay"
    Config.replay_events = trace_events
    Config.governance_level = "relaxed"

    print("\n[Audit] Triggering Relaxed Agent...")
    res = relaxed_agent()
    
    assert res["status"] == "relaxed"
    print("\nSUCCESS: Relaxed Mode is frictionless.")

if __name__ == "__main__":
    test_relaxed_mode()
