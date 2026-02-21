import os
import time
import random
import requests
import json
import agenttrace

in_memory_trace = []

class MockClient:
    @staticmethod
    def send_trace(trace_data):
        global in_memory_trace
        in_memory_trace = trace_data["events"]

agenttrace.client.AgentTraceClient.send_trace = MockClient.send_trace

def call_api(user_id):
    try:
        res = requests.get(f"https://reqres.in/api/users/{user_id}")
        if res.status_code == 200:
            return res.json()["data"]["first_name"]
        return f"Blocked {res.status_code}"
    except Exception as e:
        return f"Error {e}"

@agenttrace.run
def stress_agent():
    # 1. Nested & Multiple Network
    print("--- 1. Nested calls ---")
    data_1 = call_api(1)
    data_2 = call_api(2)
    
    # 2. Loops
    print("--- 2. Loops ---")
    loop_data = []
    for i in range(3, 5):
        loop_data.append(call_api(i))
        
    # 3. Conditional Branches (Relies on exact determinism)
    print("--- 3. Branching ---")
    val = random.randint(0, 100)
    branch_data = None
    if val > 50:
        branch_data = call_api(10)
    else:
        branch_data = call_api(11)

    return {
        "d1": data_1,
        "d2": data_2,
        "loop": loop_data,
        "branch": branch_data,
        "rand": val
    }

def run_tests():
    print("\n=== RUN 1: RECORD MODE ===")
    agenttrace.init(api_key="at_stress_test", mode="record")
    r1 = stress_agent()
    print("RECORD RESULT:", r1)
    
    time.sleep(1)
    
    print("\n=== RUN 2: REPLAY MODE (Strict Determinism) ===")
    agenttrace.init(api_key="at_stress_test", mode="replay", replay_events=in_memory_trace)
    r2 = stress_agent()
    print("REPLAY RESULT:", r2)

    if r1 == r2:
        print("\n✅ SUCCESS: Stress Determinism Achieved.")
    else:
        print("\n❌ FAILURE: Divergence detected.")

if __name__ == "__main__":
    run_tests()
