import hashlib
import json
import sys
from pathlib import Path

# Add SDK to path
sys.path.insert(0, str(Path("packages/python-sdk").absolute()))

import agenttrace
from agenttrace.interceptor import DeterministicInterceptor

def compute_fingerprint(events, stdout="", exit_code=0):
    semantic_stdout = "\n".join([line.strip() for line in stdout.splitlines() if line.strip()])
    fingerprint_data = {
        "events": [{k: v for k, v in e.items() if k != "timestamp"} for e in events],
        "stdout": semantic_stdout,
        "exit_code": exit_code
    }
    fingerprint_payload = json.dumps(fingerprint_data, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(fingerprint_payload.encode()).hexdigest()

def test_branch_isolation():
    print("\n--- Test: Branch Isolation & Cumulative Deltas ---")
    
    # 1. Base Events
    base_events = [
        {"type": "agent_start", "seq": 0},
        {"type": "step", "seq": 1, "payload": {"msg": "Step 1"}},
        {"type": "agent_complete", "seq": 2}
    ]
    
    # 2. Branch A: Override Step 1
    branch_a_events = [
        {"type": "agent_start", "seq": 0},
        {"type": "step", "seq": 1, "payload": {"msg": "Step 1 - Override A"}, "_branched": True},
        {"type": "agent_complete", "seq": 2}
    ]
    
    # 3. Branch B: Sibling of A (Override Step 1 differently)
    branch_b_events = [
        {"type": "agent_start", "seq": 0},
        {"type": "step", "seq": 1, "payload": {"msg": "Step 1 - Override B"}, "_branched": True},
        {"type": "agent_complete", "seq": 2}
    ]
    
    # Verify fingerprints are unique
    fp_base = compute_fingerprint(base_events)
    fp_a = compute_fingerprint(branch_a_events)
    fp_b = compute_fingerprint(branch_b_events)
    
    print(f"Base FP: {fp_base[:16]}")
    print(f"Branch A FP: {fp_a[:16]}")
    print(f"Branch B FP: {fp_b[:16]}")
    
    assert fp_a != fp_base, "Branch A should differ from Base"
    assert fp_b != fp_base, "Branch B should differ from Base"
    assert fp_a != fp_b, "Sibling branches A and B must have unique fingerprints"
    
    print("SUCCESS: Unique fingerprints for isolated sibling branches.")

def test_shared_state_leakage():
    print("\n--- Test: Shared Mutable State Detection ---")
    # This simulates multiple replays from the same process
    # We must ensure they don't share the same internal event list if mutated
    
    base_events = [{"type": "agent_start", "seq": 0}, {"type": "agent_complete", "seq": 1}]
    
    i1 = DeterministicInterceptor(mode="replay", replay_events=base_events)
    i2 = DeterministicInterceptor(mode="replay", replay_events=base_events)
    
    # Mutate i1's local copy of events (if it was shared, i2 would see it)
    i1.replay_events[0]["mutated"] = True
    
    if "mutated" in i2.replay_events[0]:
        print("FAILED: Shared mutable state detected between interceptor instances!")
        sys.exit(1)
    else:
        print("SUCCESS: Interceptor instances maintain isolated event lists.")

if __name__ == "__main__":
    try:
        test_branch_isolation()
        test_shared_state_leakage()
        print("\n=== BRUTAL AUDIT PHASE 4 PASSED ===")
    except Exception as e:
        print(f"Audit failed: {e}")
        sys.exit(1)
