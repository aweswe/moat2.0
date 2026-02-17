import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load from .env in the current directory
load_dotenv()

def check_user(email):
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Missing Supabase credentials.")
        return

    supabase: Client = create_client(url, key)
    
    # List users
    users = supabase.auth.admin.list_users()
    found = False
    for user in users:
        if user.email == email:
            print(f"FOUND: User {email} exists with ID {user.id}")
            # Check profile
            profile = supabase.table("profiles").select("*").eq("user_id", user.id).execute()
            print(f"PROFILE: {profile.data}")
            found = True
            break
    
    if not found:
        print(f"NOT FOUND: User {email} does not exist in auth.users")

if __name__ == "__main__":
    check_user("adityaownseverything@gmail.com")
