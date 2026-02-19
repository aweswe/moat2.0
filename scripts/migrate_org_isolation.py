
import os
import requests
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

DEFAULT_ORG_ID = "6cb9b31b-1678-4395-95b4-71caa628f94e"

def run_sql(sql):
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    # Supabase /rest/v1/rpc/exec_sql (might not exist, we'll try standard REST or a proxy)
    # Actually, we can use the postgrest endpoint if it's configured, but usually psql is best.
    # Since psql is missing, I'll use the supabase-py client which is likely installed.
    from supabase import create_client
    client = create_client(supabase_url, supabase_key)
    # Supabase doesn't expose arbitrary SQL via client usually, but we can do updates.
    
    print(f"Executing migration operations...")
    
    # 1. Backfill Traces
    print("Backfilling traces...")
    res = client.table("traces").update({"org_id": DEFAULT_ORG_ID}).is_("org_id", "null").execute()
    print(f"Traces updated: {len(res.data) if res.data else 0}")

    # 2. Backfill Jobs
    print("Backfilling jobs...")
    res = client.table("jobs").update({"org_id": DEFAULT_ORG_ID}).is_("org_id", "null").execute()
    print(f"Jobs updated: {len(res.data) if res.data else 0}")
    
    # Note: Setting NOT NULL and adding INDEX requires SQL access. 
    # If psql is missing, I might have to rely on the user to run the SQL via Supabase Dashboard
    # or I can try to use the 'pg_net' or similar if available.
    # For now, I'll perform the data backfill via REST.

if __name__ == "__main__":
    run_sql("")
