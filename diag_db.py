
import os
import requests
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def check_db():
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}"
    }

    print("--- 1. Organizations ---")
    orgs = requests.get(f"{supabase_url}/rest/v1/organizations", headers=headers).json()
    for o in orgs:
        print(f"ID: {o['id']} | Name: {o['name']}")

    print("\n--- 2. Profiles ---")
    profiles = requests.get(f"{supabase_url}/rest/v1/profiles", headers=headers).json()
    for p in profiles:
        print(f"User ID: {p['user_id']} | Org ID: {p['organization_id']} | Email: {p.get('email', 'N/A')}")

    print("\n--- 3. Recent Traces ---")
    traces = requests.get(f"{supabase_url}/rest/v1/traces?limit=5&order=created_at.desc", headers=headers).json()
    for t in traces:
        print(f"ID: {t['id']} | Org ID: {t['org_id']} | Title: {t['title']}")

if __name__ == "__main__":
    check_db()
