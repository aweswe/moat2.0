import os
import sys

# Ensure local SDK is in path
sdk_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "packages", "python-sdk"))
sys.path.insert(0, sdk_path)

import agenttrace
import agenttrace.config
from agenttrace.context import _trace_ctx

agenttrace.config.init(
    api_key="at_live_7503d242ed97b23ea9ba3dc7b736f55f8b355e3d6e749aa4", 
    api_url="https://agnettrace.vercel.app/api", 
    mode="record" # Mode is overridden by environment variables in sandbox
)

@agenttrace.run(name="sandbox_test_agent")
def my_sandboxed_agent():
    import time
    import random
    import urllib.request
    
    print("--- Execution started inside sandbox ---")
    print(f"Time is: {time.time()}")
    print(f"Random number is: {random.randint(1, 100)}")
    
    try:
        req = urllib.request.Request("https://httpbin.org/get", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            html = response.read()
            print(f"Network success, got {len(html)} bytes")
    except Exception as e:
        print(f"Network failed: {e}")
        
    print("--- Execution finished ---")
    return "Success"

if __name__ == "__main__":
    import time
    if agenttrace.config.Config.mode == "record":
        print("\n1. Generating seed trace...")
        my_sandboxed_agent()
        time.sleep(2)
        trace_ctx = _trace_ctx.get()
        trace_id_generated = trace_ctx["trace_id"] if trace_ctx else "<UNKNOWN_TRACE_ID>"
        print(f"\n2. Trace generated. Please run this script with the trace_id:")
        print(f"python check_render_execute.py {trace_id_generated}")
    else:
        print("\n1. Running in sandbox (REPLAY MODE)...")
        my_sandboxed_agent()
