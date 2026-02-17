import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def check_policies():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(url, key)
    
    # Check policies via a direct query to pg_policies if the role has access
    # Since we use service_role, we might be able to query internal schemas
    try:
        res = supabase.rpc("get_policies", {"table_name": "profiles"}).execute()
        print("Policies for profiles (via RPC if exists):", res.data)
    except:
        print("RPC 'get_policies' not found. Trying raw query via a temporary table check if allowed.")

    # Alternative: check what happens if we try to impersonate a user (hard with SDK)
    # Let's just try to check the schema of profiles again to be 100% sure about the email column too.
    try:
        res = supabase.table("profiles").select("*").limit(0).execute()
        print("Profiles schema check (success indicates table exists and columns are resolved):", res)
    except Exception as e:
        print("Schema check failed:", e)

if __name__ == "__main__":
    check_policies()
