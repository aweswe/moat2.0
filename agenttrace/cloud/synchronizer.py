import os
import time
import json
import threading
import requests
from typing import Optional, Dict, Any
from pathlib import Path

# Try to import Supabase client if available
try:
    from supabase import create_client, Client
except ImportError:
    Client = None
    create_client = None

class CloudSynchronizer:
    """
    Layer 2: Cloud Sync Service.
    Handles reliable upload of trace artifacts (events, keyframes) and metadata
    to the cloud backend (Supabase).
    """
    
    def __init__(self, project_url: str, anon_key: str):
        self.project_url = project_url
        self.anon_key = anon_key
        self.client: Optional[Client] = None
        self._Connect()
        
    def _Connect(self):
        if not create_client:
            print("[AgentTrace] [WARN] Supabase SDK not installed. Cloud sync disabled.")
            return
            
        try:
            self.client = create_client(self.project_url, self.anon_key)
        except Exception as e:
            print(f"[AgentTrace] [ERROR] Failed to connect to Supabase: {e}")
            self.client = None

    def upload_trace(self, trace_id: str, trace_dir: str):
        """
        Uploads all artifacts for a given trace to Cloud Storage.
        Blocks until completion (for now), but safe to run in a thread.
        """
        if not self.client:
            return

        print(f"[AgentTrace] ☁️ Syncing trace {trace_id} to cloud...")
        
        # 1. Upload events.jsonl
        events_path = os.path.join(trace_dir, "events.jsonl")
        if os.path.exists(events_path):
            self._upload_file("traces", f"{trace_id}/events.jsonl", events_path)
            
        # 2. Upload metadata.json
        metadata_path = os.path.join(trace_dir, "metadata.json")
        if os.path.exists(metadata_path):
            self._upload_file("traces", f"{trace_id}/metadata.json", metadata_path)
            
            # 3. Optimistic DB Registration
            # We try to register the trace in Postgres 'traces' table
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                self._register_trace_db(trace_id, meta)
            except Exception as e:
                print(f"[AgentTrace] [WARN] Failed to register trace in DB: {e}")

        # 4. Upload snapshots (if any)
        snapshots_dir = os.path.join(trace_dir, "snapshots")
        if os.path.exists(snapshots_dir):
            for snap in os.listdir(snapshots_dir):
                snap_path = os.path.join(snapshots_dir, snap)
                if os.path.isfile(snap_path):
                    self._upload_file("traces", f"{trace_id}/snapshots/{snap}", snap_path)

        print(f"[AgentTrace] ✅ Cloud sync complete: {trace_id}")

    def _upload_file(self, bucket: str, key: str, file_path: str, retries=3):
        """
        Uploads a single file to Supabase Storage with retries.
        """
        if not self.client:
            return

        for attempt in range(retries):
            try:
                with open(file_path, "rb") as f:
                    file_bytes = f.read()
                
                # Upsert is safer
                self.client.storage.from_(bucket).upload(
                    path=key,
                    file=file_bytes,
                    file_options={"upsert": "true", "content-type": "application/json"} 
                )
                return
            except Exception as e:
                # If error is "The resource already exists" (and we didn't use upsert), ignore
                # But we used upsert "true" (as string? SDK varies).
                # Actually supabase-py storage options usually take a dict.
                if attempt == retries - 1:
                    print(f"[AgentTrace] [ERROR] Failed to upload {key}: {e}")
                else:
                    time.sleep(1 * (attempt + 1))

    def _register_trace_db(self, trace_id: str, metadata: Dict[str, Any]):
        """
        Inserts/Updates the trace record in Postgres via Vercel API.
        """
        api_url = os.environ.get("AGENTTRACE_API_URL", "http://localhost:3000/api")
        register_url = f"{api_url}/trace/register"
        
        payload = {
            "trace_id": trace_id,
            "metadata": metadata,
            # If we had org_id/user_id in metadata, they'd be used by the backend
        }
        
        try:
            print(f"[AgentTrace] ☁️ Registering trace in DB: {register_url}")
            resp = requests.post(register_url, json=payload, timeout=10)
            if resp.status_code >= 400:
                print(f"[AgentTrace] [WARN] DB registration failed: {resp.status_code} {resp.text}")
            else:
                print(f"[AgentTrace] ✅ Trace registered in DB")
        except Exception as e:
            print(f"[AgentTrace] [WARN] DB registration network error: {e}")

    def download_trace(self, trace_id: str, dest_dir: str) -> bool:
        """
        Downloads relevant trace artifacts from Cloud Storage to local directory.
        Returns True if at least events.jsonl or metadata.json was downloaded.
        """
        if not self.client:
            print("[AgentTrace] [WARN] Cannot download trace: Cloud client not initialized.")
            return False

        print(f"[AgentTrace] ☁️ Downloading trace {trace_id} from cloud...")
        os.makedirs(dest_dir, exist_ok=True)

        success = False
        artifacts = ["metadata.json", "events.jsonl"]
        
        for artifact in artifacts:
            try:
                remote_path = f"{trace_id}/{artifact}"
                data = self.client.storage.from_("traces").download(remote_path)
                if data:
                    local_path = os.path.join(dest_dir, artifact)
                    with open(local_path, "wb") as f:
                        f.write(data)
                    print(f"[AgentTrace]   Dataset: {artifact}")
                    success = True
            except Exception:
                # Quietly fail for individual files (might not exist)
                pass
        
        if not success:
            print(f"[AgentTrace] [WARN] Trace {trace_id} could not be retrieved from cloud.")
        
        return success
