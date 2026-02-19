import subprocess
import json
import sys
import os

def verify():
    trace_id = "630b36d7-7cf1-4cde-8da9-ea662dfb6def"
    branch_id = "e5ae420a-b3a2-41d5-bfb2-cc48a0d4acf5"
    step = "0"
    
    cmd = [sys.executable, "scripts/replay_handler.py", "--trace-id", trace_id, "--step", step, "--branch", branch_id]
    print(f"Running: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    
    # Filter stdout for the JSON line
    lines = result.stdout.splitlines()
    json_line = None
    for line in lines:
        if line.strip().startswith('{"success":'):
            json_line = line.strip()
            break
            
    if not json_line:
        print("ERROR: No JSON output found in stdout")
        print("--- STDOUT ---")
        print(result.stdout)
        print("--- STDERR ---")
        print(result.stderr)
        return False
        
    try:
        data = json.loads(json_line)
        print("\nSUCCESS: JSON parsed correctly")
        print(f"Items in events: {len(data.get('events', []))}")
        print(f"Branch: {data.get('branch')}")
        print(f"Parent Hash: {data.get('parentHash')}")
        
        # Check first event if exists
        events = data.get('events', [])
        if events:
            print("\nFirst event sample:")
            print(json.dumps(events[0], indent=2))
        else:
            print("\nNo events in visible range (Step 0)")
            
        return True
    except Exception as e:
        print(f"ERROR: Failed to parse JSON: {e}")
        print("Raw JSON line:", json_line)
        return False

if __name__ == "__main__":
    verify()
