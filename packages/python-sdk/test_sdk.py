import os
import time

# Mock the environment variables for local testing
os.environ["AGENTTRACE_API_URL"] = "http://localhost:3000/api"

import agenttrace

# We use a dummy API key for the local dev environment (make sure this matches a valid key if RLS is strict, or we can just look at the console output)
# Since we are testing against localhost:3000, we need a valid key from the local DB.
# For now, let's just use whatever key you have or a dummy one. If the server rejects it, we'll see the 401.
agenttrace.init(api_key="at_live_test_123")

@agenttrace.run(name="test_local_agent")
def my_agent():
    print("Agent started...")
    
    with agenttrace.step("Process Data", type="tool_call", input={"data": "raw"}):
        print("Processing data...")
        time.sleep(0.5)
        agenttrace.set_result({"status": "processed", "value": 42})
        
    with agenttrace.step("Think", type="thought"):
        print("Thinking...")
        time.sleep(0.2)
        agenttrace.set_result({"thought": "The data looks good."})

    print("Agent finished.")
    return "Success"

if __name__ == "__main__":
    my_agent()
    # Sleep briefly to allow the background thread to finish uploading the trace
    time.sleep(2)
