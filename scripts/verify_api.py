"""Test the /api/replay endpoint (used for both Replay and Diff)."""
import requests
import json

BASE_URL = "http://localhost:3000"
TRACE_ID = "3f7d31df-11f1-4ede-a86f-3a4993814c42"

def test_replay():
    print(f"=== Testing /api/replay (Base Trace) ===")
    payload = {"traceId": TRACE_ID, "step": 3}
    try:
        r = requests.post(f"{BASE_URL}/api/replay", json=payload)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Success: {data['success']}")
            print(f"Event Count: {len(data['events'])}")
            print(f"State keys: {list(data['state'].keys())}")
            print(f"Parent Hash: {data['parentHash'][:16]}...")
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"Req failed: {e}")

def test_diff():
    # Use one of the branches created during e2e tests
    BRANCH_ID = "40e34305-c958-482a-9c91-18e70e90f5d2" 
    print(f"\n=== Testing /api/replay (Branch Diff) ===")
    payload = {"traceId": TRACE_ID, "branch": BRANCH_ID}
    try:
        r = requests.post(f"{BASE_URL}/api/replay", json=payload)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Success: {data['success']}")
            print(f"Branch: {data['branch']}")
            # Check for branched events
            branched = [e for e in data['events'] if e.get("_branched")]
            print(f"Branched events found: {len(branched)}")
            if branched:
                print(f"First branched payload: {branched[0]['payload']}")
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"Req failed: {e}")

if __name__ == "__main__":
    test_replay()
    test_diff()
