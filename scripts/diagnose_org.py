"""Diagnose org_id lookup and re-test insert."""
import os, sys, json
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

# Find the org_id for this trace
print("=== Looking up org_id for trace ===")
for table in ["traces", "trace_runs", "trace_metadata"]:
    try:
        r = client.table(table).select("id,org_id").eq("id", TRACE_ID).execute()
        if r.data:
            print(f"Found in '{table}': {r.data[0]}")
            break
        else:
            print(f"  {table}: not found")
    except Exception as e:
        print(f"  {table}: error - {e}")

# Try insert with explicit org_id from user profile
print("\n=== Looking up org_id from profiles ===")
try:
    r = client.table("profiles").select("id,organization_id").limit(3).execute()
    for p in r.data:
        print(f"  profile: {p}")
except Exception as e:
    print(f"  profiles error: {e}")

# Look at the actual traces table columns
print("\n=== Traces table sample ===")
try:
    r = client.table("traces").select("id,org_id,title").limit(3).execute()
    for t in r.data:
        print(f"  {t}")
except Exception as e:
    print(f"  traces error: {e}")
