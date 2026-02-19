"""Create a branch with a clean override to verify divergence."""
import subprocess
import sys
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent

def run_create():
    TRACE_ID = "3f7d31df-11f1-4ede-a86f-3a4993814c42"
    payload = {"content_preview": "DIVERGED_ON_STEP_3"}
    
    cmd = [
        sys.executable, str(ROOT / "scripts" / "branch_handler.py"),
        "create",
        "--trace-id", TRACE_ID,
        "--fork-step", "3",
        "--name", "divergence-test-v2",
        "--override", json.dumps(payload)
    ]
    
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT))
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
    return json.loads(result.stdout)

if __name__ == "__main__":
    res = run_create()
    if res["success"]:
        print(f"\nBranch created: {res['branchId']}")
        print(f"Saved to cloud: {res['savedToCloud']}")
    else:
        print(f"\nError: {res.get('error')}")
