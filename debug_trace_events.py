import os
import json
from supabase import create_client

def debug_events(trace_id):
    from dotenv import load_dotenv
    load_dotenv()
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        print("Missing Supabase credentials")
        return
    
    client = create_client(url, key)
    res = client.table('trace_events').select('*').eq('trace_id', trace_id).order('seq').execute()
    
    print(f"Trace: {trace_id}")
    print(f"Total events: {len(res.data)}")
    for e in res.data:
        print(f"Seq: {e.get('seq')}, Type: {e.get('type')}, Path: {e.get('path')}")

if __name__ == "__main__":
    debug_events('8d77a8ba-fa77-41b4-8749-11f6a48a91e5')
