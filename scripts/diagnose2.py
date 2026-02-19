"""Diagnose and fix: try insert with full data to see exact error."""
import os, sys, json, uuid
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

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

TRACE_ID = "3f7d31df-11f1-4ede-a86f-3a4993814c42"

# Get org_id
r = client.table("traces").select("org_id").eq("id", TRACE_ID).execute()
print("Trace lookup:", r.data)
org_id = r.data[0]["org_id"]
print(f"org_id: {org_id}")

# Try insert with all required fields
test_record = {
    "trace_id": TRACE_ID,
    "org_id": org_id,
    "fork_step": 2,
    "name": "diagnostic-full",
    "overrides": {"_parent_hash": "abc123", "_override": {"test": True}},
}
print(f"\nInserting: {json.dumps(test_record, indent=2)}")

try:
    result = client.table("branches").insert(test_record).execute()
    print("SUCCESS:", result.data)
except Exception as e:
    print(f"ERROR: {e}")
    print(f"Type: {type(e)}")
