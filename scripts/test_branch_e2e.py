"""Test the branch handler end-to-end against live Supabase."""
import subprocess
import sys
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent

def run(args):
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "branch_handler.py")] + args,
        capture_output=True, text=True, cwd=str(ROOT)
    )
    print("STDOUT:", result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr[:500])
    data = json.loads(result.stdout)
    return data, result.returncode

TRACE_ID = "3f7d31df-11f1-4ede-a86f-3a4993814c42"

print("=== TEST 1: Create branch ===")
data, code = run([
    "create",
    "--trace-id", TRACE_ID,
    "--fork-step", "2",
    "--name", "e2e-test-branch",
    "--override", json.dumps({"content_preview": "MULTIVERSE_OVERRIDE"}),
])
assert code == 0, f"Exit code: {code}"
assert data["success"], f"Not success: {data}"
branch_id = data["branchId"]
print(f"Created branch: {branch_id}")
print(f"Saved to cloud: {data['savedToCloud']}")
print(f"Parent hash: {data['parentHash'][:16]}...")

print("\n=== TEST 2: List branches ===")
data2, code2 = run(["list", "--trace-id", TRACE_ID])
assert code2 == 0
assert data2["success"]
print(f"Found {len(data2['branches'])} branch(es)")
for b in data2["branches"]:
    print(f"  {b['id']} | step={b['forkStep']} | name={b['name']}")

print("\n✅ All tests passed!")
