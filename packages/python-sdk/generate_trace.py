import os
import agenttrace
import urllib.request
import json
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ.get("AGENTTRACE_API_KEY", "at_live_test")
API_URL = "https://moat-kappa.vercel.app/api"
# Check if running locally or not
agenttrace.init(api_key=API_KEY, api_url=API_URL, mode="record")

@agenttrace.run("verify_seq_agent")
def run_agent():
    print("Agent started...")
    url = "https://httpbin.org/get"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            print(f"Network call 1 complete: {len(data)} bytes")
    except Exception as e:
        print(f"Network call failed: {e}")
        
    url2 = "https://httpbin.org/status/200"
    req2 = urllib.request.Request(url2)
    try:
        with urllib.request.urlopen(req2) as resp:
            print(f"Network call 2 complete: Status {resp.status}")
    except Exception as e:
        print(f"Network call failed: {e}")

    print("Agent finished.")

if __name__ == "__main__":
    run_agent()
