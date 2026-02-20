import os
import requests
import json
import time

RENDER_API_KEY = "rnd_ikgQnyGLWxcBbClHopWttRzGmxxu"
HEADERS = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}
BASE_URL = "https://api.render.com/v1"

def deploy_service():
    # 1. Get Owner ID
    owner_id = None
    print("Fetching Render user info...")
    resp = requests.get(f"{BASE_URL}/users", headers=HEADERS)
    if resp.status_code == 200:
        me = resp.json()
        print(f"Logged in as: {me.get('email')}")
        
    print("Fetching owners...")
    owners_resp = requests.get(f"{BASE_URL}/owners", headers=HEADERS)
    if owners_resp.status_code == 200:
        owners = owners_resp.json()
        if owners:
            owner_id = owners[0]['owner']['id']
            print(f"Using Owner ID: {owner_id}")
    
    if not owner_id:
        print("Could not find owner ID. Error:", owners_resp.text)
        return

    # 2. Check if service already exists
    print("Checking existing services...")
    services_resp = requests.get(f"{BASE_URL}/services?limit=50", headers=HEADERS)
    existing_url = None
    if services_resp.status_code == 200:
        for s in services_resp.json():
            service = s.get('service', {})
            if service.get('name') == "agenttrace-execution-engine":
                print("Service already exists! Triggering deploy...")
                srv_id = service['id']
                existing_url = service['serviceDetails']['url']
                requests.post(f"{BASE_URL}/services/{srv_id}/deploys", headers=HEADERS)
                print(f"Deploy triggered! URL: {existing_url}")
                return existing_url
                
    # 3. Create Service
    print("Creating new Web Service...")
    # NOTE: Need actual Supabase keys for the Render container to work!
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "dummy")
    
    payload = {
        "type": "web_service",
        "name": "agenttrace-execution-engine",
        "ownerId": owner_id,
        "repo": "https://github.com/aweswe/moat2.0",
        "autoDeploy": "yes",
        "branch": "main",
        "rootDir": "apps/backend",
        "serviceDetails": {
             "env": "docker",
             "plan": "free",
             "region": "oregon",
             "pullRequestPreviewsEnabled": "no",
             "envVars": [
                {
                    "key": "NEXT_PUBLIC_SUPABASE_URL",
                    "value": supabase_url
                },
                {
                    "key": "SUPABASE_SERVICE_ROLE_KEY",
                    "value": supabase_key
                }
            ]
        }
    }
    
    create_resp = requests.post(f"{BASE_URL}/services", headers=HEADERS, json=payload)
    if create_resp.status_code == 201:
        data = create_resp.json()
        print(f"Service created! URL: {data['serviceDetails']['url']}")
        with open("render_url.txt", "w") as f:
            f.write(data['serviceDetails']['url'])
        return data['serviceDetails']['url']
    else:
        print("Failed to create service:", create_resp.status_code)
        print(create_resp.text)

if __name__ == "__main__":
    deploy_service()
