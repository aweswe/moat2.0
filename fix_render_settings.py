"""Fix Render service settings via the REST API."""
import requests
import json

API_KEY = "rnd_ikgQnyGLWxcBbClHopWttRzGmxxu"
SERVICE_ID = "srv-d6cao1rnv86c73cvk7m0"
headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Step 1: Read current service config
r = requests.get(f"https://api.render.com/v1/services/{SERVICE_ID}", headers=headers)
svc = r.json()
print("=== CURRENT CONFIG ===")
sd = svc.get("serviceDetails", {})
print(f"Root Directory: {sd.get('rootDir', 'NOT SET')}")
print(f"Build Command: {sd.get('buildCommand', 'NOT SET')}")
print(f"Start Command: {sd.get('startCommand', 'NOT SET')}")
print()

# Step 2: PATCH with flat structure (common for Web Services)
patch2 = {
    "rootDir": "apps/backend",
    "buildCommand": "pip install -r requirements.txt",
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
}
r3 = requests.patch(
    f"https://api.render.com/v1/services/{SERVICE_ID}",
    headers=headers,
    json=patch2
)
print(f"PATCH flat status: {r3.status_code}")
if r3.status_code == 200:
    updated = r3.json()
    print("Updated Config (Flat Response):")
    print(f"Root Directory: {updated.get('rootDir')}")
    print(f"Build Command: {updated.get('buildCommand')}")
    print(f"Start Command: {updated.get('startCommand')}")
else:
    print(f"Error Patching: {r3.text}")

# Step 3: Trigger a deploy
print("\n=== TRIGGERING DEPLOY ===")
deploy_r = requests.post(
    f"https://api.render.com/v1/services/{SERVICE_ID}/deploys",
    headers=headers,
    json={}
)
print(f"Deploy status: {deploy_r.status_code}")
if deploy_r.status_code in [200, 201]:
    dep = deploy_r.json()
    print(f"Deploy ID: {dep.get('id', 'unknown')}")
    print(f"Deploy status: {dep.get('status', 'unknown')}")
    print("Deploy triggered successfully!")
else:
    print(f"Deploy error: {deploy_r.text[:300]}")
