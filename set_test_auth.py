import os
import argparse
from supabase import create_client, Client

def set_test_password(email, password):
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Missing Supabase credentials in environment.")
        return

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

    # Update password
    res = supabase.auth.admin.update_user_by_id(
        user_id,
        attributes={"password": password}
    )
    print(f"✅ Password updated for {email}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", default="adityownseverything@gmail.com")
    parser.add_argument("--password", default="password123")
    args = parser.parse_args()
    
    set_test_password(args.email, args.password)
