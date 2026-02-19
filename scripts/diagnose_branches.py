"""Diagnose why branch inserts fail in Supabase."""
import os, sys, json
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# Load env
env_path = ROOT / ".env"
if env_path.exists():
    for line in open(env_path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from supabase import create_client

url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
client = create_client(url, key)

# 1. Try a minimal insert
print("=== Inserting minimal test record ===")
try:
    test_rec = {
        "trace_id": "3f7d31df-11f1-4ede-a86f-3a4993814c42",
        "fork_step": 99,
        "name": "diagnostic-test",
        "overrides": {"_test": True},
    }
    result = client.table("branches").insert(test_rec).execute()
    print("Insert success:", json.dumps(result.data, indent=2))
except Exception as e:
    print(f"Insert error: {e}")

# 2. List all branches
print("\n=== All branches ===")
try:
    result = client.table("branches").select("*").execute()
    print(f"Count: {len(result.data)}")
    for b in result.data:
        print(f"  {b}")
except Exception as e:
    print(f"List error: {e}")
