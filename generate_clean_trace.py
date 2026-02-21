import sys
import os
import urllib.request
import json

# Force import from the local, newly fixed SDK
sdk_root = os.path.abspath("packages/python-sdk")
sys.path = [sdk_root] + [p for p in sys.path if p != os.getcwd()]

import agenttrace

# The user's API Key and URL
os.environ["AGENTTRACE_API_KEY"] = "at_live_cf97bdcf909d78d3677916f8f4abac6e38e4dabcd520ccb9"
os.environ["AGENTTRACE_API_URL"] = "https://www.theagenttrace.com/api"

# Force development URL since we might be testing locally or against the real backend
agenttrace.init()

@agenttrace.run(name="clean_hash_test_agent")
def main():
    print("Agent started. Making a deterministic network call...")
    
    req = urllib.request.Request("https://httpbin.org/get")
    with urllib.request.urlopen(req) as response:
        data = response.read()
        print(f"Call 1 complete: {len(data)} bytes")
        
    req2 = urllib.request.Request("https://httpbin.org/status/200")
    with urllib.request.urlopen(req2) as response:
        print(f"Call 2 complete: Status {response.status}")
        
    print("Agent finished.")
    return {"status": "success", "message": "Clean trace generated!"}

if __name__ == "__main__":
    main()
