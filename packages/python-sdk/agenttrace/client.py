import os
import json
import requests
import threading
from typing import Dict, Any

from .config import Config

class AgentTraceClient:
    """Non-blocking client to ship traces to the AgentTrace backend."""
    
    @staticmethod
    def send_trace(trace_payload: Dict[str, Any]):
        """Fire and forget trace upload in a background thread."""
        api_key = Config.api_key or os.environ.get("AGENTTRACE_API_KEY")
        api_url = Config.api_url or os.environ.get("AGENTTRACE_API_URL", "https://moat-kappa.vercel.app/api")
        
        if not api_key:
            print("[AgentTrace] Warning: No API key found. Trace will not be uploaded.")
            return

        def _upload():
            try:
                endpoint = f"{api_url}/trace/register"
                resp = requests.post(
                    endpoint,
                    json=trace_payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=10 
                )
                if resp.status_code != 200:
                    print(f"[AgentTrace] Upload failed ({resp.status_code}): {resp.text}")
            except Exception as e:
                print(f"[AgentTrace] Upload error: {e}")

        # Non-blocking background thread
        thread = threading.Thread(target=_upload, daemon=True)
        thread.start()
