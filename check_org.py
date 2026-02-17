import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def check_org():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(url, key)
    
    org_id = "6cb9b31b-1678-4395-95b4-71caa628f94e"
    res = supabase.table("organizations").select("*").eq("id", org_id).execute()
    print(f"Organization {org_id}: {res.data}")
    
    if not res.data:
        # List all orgs to see what's available
        all_orgs = supabase.table("organizations").select("*").execute()
        print("Available Organizations:", all_orgs.data)

if __name__ == "__main__":
    check_org()
