import os
import time
import random
import requests
import json
import agenttrace

# Fake a trace memory store
in_memory_trace = []

# Mock the AgentTraceClient to just dump to our memory store instead of network
class MockClient:
    @staticmethod
    def send_trace(trace_data):
        global in_memory_trace
        in_memory_trace = trace_data["events"]

agenttrace.client.AgentTraceClient.send_trace = MockClient.send_trace

@agenttrace.run
def my_agent():
    print("--- Agent Running ---")
    
    # 1. Check time
    current_time = time.time()
    print(f"Time: {current_time}")
    
    # 2. Check randomness
    rand_val = random.randint(1, 100)
    print(f"Random: {rand_val}")
    
    # 3. Network request
    try:
        res = requests.get("https://reqres.in/api/users/2")
        print(f"Network status: {res.status_code}")
        if res.status_code == 200:
            net_data = res.json()["data"]["first_name"]
        else:
            net_data = "Blocked (Non-200)"
    except Exception as e:
        print(f"Network failed: {e}")
        net_data = None
        
    print(f"Network data: {net_data}")
    
    # We must explicitly log these boundaries in the standard trace so the player can consume them.
    # Normally this happens automatically inside our LLM/Tool wrappers.
    # For now, we manually push an event to simulate the boundary recording:
    with agenttrace.step("Network Call", type="tool_call"):
        agenttrace.set_result({
            "response": res.content.decode('utf-8') if 'res' in locals() else "{}"
        })

    return {
        "time": current_time,
        "rand": rand_val,
        "net": net_data
    }

def run_tests():
    print("\n=== RUN 1: RECORD MODE ===")
    agenttrace.init(api_key="at_live_test", mode="record")
    record_result = my_agent()
    
    print("\nRecorded Trace Events:")
    print(json.dumps(in_memory_trace, indent=2))
    
    # Wait a bit so the time naturally drifts
    time.sleep(1)
    
    print("\n=== RUN 2: REPLAY MODE ===")
    # Initialize with the recorded events
    agenttrace.init(api_key="at_live_test", mode="replay", replay_events=in_memory_trace)
    
    # Run the agent again. It should exactly mirror run 1.
    replay_result = my_agent()
    
    print("\n=== RESULTS VERIFICATION ===")
    print(f"Record Result: {record_result}")
    print(f"Replay Result: {replay_result}")
    
    if record_result == replay_result:
        print("✅ SUCCESS: Pure Determinism Achieved.")
    else:
        print("❌ FAILURE: Results diverged.")

if __name__ == "__main__":
    run_tests()
