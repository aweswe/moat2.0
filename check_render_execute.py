import requests
import json
import time

API_URL = "http://localhost:8000"

def test_execute():
    # We need a valid trace ID that exists in the local Supabase DB
    # Let's get the most recent one
    print("Fetching recent traces...")
    
    # We don't have a direct /traces list endpoint in this server, 
    # but we can try to get a branch or just use a known trace ID if you have one.
    # For now, let's create a dummy trace using the python SDK directly to ensure we have one.
    import os
    import sys
    sdk_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "packages", "python-sdk"))
    sys.path.insert(0, sdk_path)
    import agenttrace
    import agenttrace.config
    from agenttrace.context import _trace_ctx
    
    # Store the trace on the actual Vercel backend so Supabase has it
    agenttrace.config.init(
        api_key="at_live_7503d242ed97b23ea9ba3dc7b736f55f8b355e3d6e749aa4", 
        api_url="https://agnettrace.vercel.app/api", 
        mode="record"
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
        
    print("\n1. Generating seed trace...")
    my_sandboxed_agent()
    
    # Give the background thread a moment to flush the trace to the backend
    time.sleep(2)
    
    trace_ctx = _trace_ctx.get()
    trace_id_generated = trace_ctx["trace_id"] if trace_ctx else "<UNKNOWN_TRACE_ID>"
    print(f"\n2. Trace generated. Please run this script with the trace_id:")
    print(f"python check_render_execute.py {trace_id_generated}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        trace_id = sys.argv[1]
        print(f"\nCalling /replay/execute for trace: {trace_id}")
        
        res = requests.post(f"{API_URL}/replay/execute", json={
            "trace_id": trace_id
        })
        
        print(f"Response Status: {res.status_code}")
        print(json.dumps(res.json(), indent=2))
    else:
        test_execute()
