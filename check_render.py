import requests

RENDER_API_KEY = "rnd_ikgQnyGLWxcBbClHopWttRzGmxxu"
HEADERS = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Accept": "application/json",
}
BASE_URL = "https://api.render.com/v1"

r = requests.get(f"{BASE_URL}/services?limit=5", headers=HEADERS)
for s in r.json():
    svc = s.get("service", {})
    if svc.get("name") == "agenttrace-execution-engine":
        sid = svc["id"]
        print(f"Service: {svc['name']} ({sid})")
        print(f"URL: {svc.get('serviceDetails', {}).get('url', 'N/A')}")
        
        dr = requests.get(f"{BASE_URL}/services/{sid}/deploys?limit=3", headers=HEADERS)
        for d in dr.json():
            dep = d.get("deploy", {})
            print(f"  Deploy: {dep.get('status')} | {dep.get('createdAt')}")
        break
