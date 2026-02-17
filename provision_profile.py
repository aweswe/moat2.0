import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def provision_profile(email):
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(url, key)
    
    # Get user ID
    users = supabase.auth.admin.list_users()
    user_id = None
    for user in users:
        if user.email == email:
            user_id = user.id
            break
    
    if not user_id:
        print(f"User {email} not found.")
        return

    # Create profile
    # Default Org ID
    org_id = "6cb9b31b-1678-4395-95b4-71caa628f94e"
    
    profile_data = {
        "user_id": user_id,
        "organization_id": org_id,
        "role": "owner",
        "display_name": "Aditya"
    }
    
    # Check if exists
    res = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    if res.data:
        print("Profile already exists. Updating...")
        supabase.table("profiles").update(profile_data).eq("user_id", user_id).execute()
    else:
        print("Creating profile...")
        supabase.table("profiles").insert(profile_data).execute()
    
    print(f"✅ Profile provisioned for {email}")

if __name__ == "__main__":
    provision_profile("adityaownseverything@gmail.com")
