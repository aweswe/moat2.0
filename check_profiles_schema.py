import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def check_schema():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(url, key)
    
    # Check profiles table info via RPC or just a sample select
    try:
        res = supabase.table("profiles").select("*").limit(1).execute()
        if res.data:
            print("Columns found in a record:", res.data[0].keys())
        else:
            print("Table empty, cannot see columns via simple select.")
            
        # Try to insert a dummy record to see the error detail
        dummy_res = supabase.table("profiles").insert({"user_id": "00000000-0000-0000-0000-000000000000"}).execute()
        print("Insert dummy result:", dummy_res)
    except Exception as e:
        print("Error during schema check:", e)

if __name__ == "__main__":
    check_schema()
