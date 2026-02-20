import requests

RENDER_API_KEY = "rnd_ikgQnyGLWxcBbClHopWttRzGmxxu"
HEADERS = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}
BASE_URL = "https://api.render.com/v1"

# Real Supabase creds
ENV_VARS = {
    "NEXT_PUBLIC_SUPABASE_URL": "https://wddxzszcjturywfzjxjy.supabase.co/",
    "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZHh6c3pjanR1cnl3ZnpqeGp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc0MzQ5MCwiZXhwIjoyMDc5MzE5NDkwfQ.Jqic9fji_5WXXvkf0OZ3gGA-ET9zAUuupha6bjK-59s",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZHh6c3pjanR1cnl3ZnpqeGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDM0OTAsImV4cCI6MjA3OTMxOTQ5MH0.JEttPhZeWydYNrEK3M_lyLIf0phIdLCSzNW30kO09EI"
}

def update_env_vars():
    # 1. Find the service
    print("Finding service...")
    resp = requests.get(f"{BASE_URL}/services?limit=50", headers=HEADERS)
    service_id = None
    for s in resp.json():
        svc = s.get("service", {})
        if svc.get("name") == "agenttrace-execution-engine":
            service_id = svc["id"]
            print(f"Found service: {service_id}")
            break
    
    if not service_id:
        print("Service not found!")
        return
    
    # 2. Update env vars
    print("Updating environment variables...")
    env_list = [{"key": k, "value": v} for k, v in ENV_VARS.items()]
    
    resp = requests.put(
        f"{BASE_URL}/services/{service_id}/env-vars",
        headers=HEADERS,
        json=env_list
    )
    
    if resp.status_code in (200, 201):
        print(f"Env vars updated successfully!")
    else:
        print(f"Failed: {resp.status_code} - {resp.text}")
    
    # 3. Trigger redeploy
    print("Triggering redeploy...")
    deploy_resp = requests.post(f"{BASE_URL}/services/{service_id}/deploys", headers=HEADERS)
    if deploy_resp.status_code in (200, 201):
        print("Redeploy triggered!")
    else:
        print(f"Deploy trigger failed: {deploy_resp.status_code} - {deploy_resp.text}")

if __name__ == "__main__":
    update_env_vars()
