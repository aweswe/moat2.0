import concurrent.futures
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

def run_isolated_replay(trace_events):
    # Simulate a replay execution within an interceptor context
    interceptor = DeterministicInterceptor(mode="replay", replay_events=trace_events)
    interceptor.setup()
    
    # Mocking execution: just simulate consuming events and producing stdout
    # In a real scenario, this would be the actual agent execution
    try:
        # Simulate some logic that might accidentally mutate the events if shared
        for event in interceptor.replay_events:
            event["_visited_by_thread"] = True
            
        fp = compute_fingerprint(interceptor.replay_events, stdout="Success", exit_code=0)
        return fp
    finally:
        interceptor.teardown()

def test_concurrency_100():
    print("\n--- Test 13: 100 Parallel Replays Stress Test ---")
    
    base_events = [
        {"type": "agent_start", "seq": 0},
        {"type": "step", "seq": 1, "payload": {"data": "test"}},
        {"type": "agent_complete", "seq": 2}
    ]
    
    # Compute the expected "clean" fingerprint once
    expected_fp = compute_fingerprint(base_events, stdout="Success", exit_code=0)
    print(f"Target Fingerprint: {expected_fp[:16]}")
    
    num_parallel = 100
    results = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(run_isolated_replay, base_events) for _ in range(num_parallel)]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
            
    # Check if all fingerprints match each other (zero drift)
    unique_results = set(results)
    
    # Verify base_events was NOT mutated
    if "_visited_by_thread" in base_events[0]:
        print("FAILED: Global source mutation detected! deepcopy failed or not used correctly.")
        sys.exit(1)
        
    if len(unique_results) == 1:
        print(f"SUCCESS: All {num_parallel} parallel replays produced identical footprints ({results[0][:16]}).")
        print("SUCCESS: Zero drift detected. Global source remained pristine.")
    else:
        print(f"FAILED: Fingerprint drift detected during parallel execution!")
        print(f"Unique fingerprints found: {len(unique_results)}")
        for i, fp in enumerate(unique_results):
            print(f"  FP {i}: {fp[:16]}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        test_concurrency_100()
        print("\n=== BRUTAL AUDIT PHASE 5 PASSED ===")
    except Exception as e:
        print(f"Audit failed: {e}")
        sys.exit(1)
