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
        api_url = Config.api_url or os.environ.get("AGENTTRACE_API_URL", "https://www.theagenttrace.com/api")
        
        if not api_key:
            print("[AgentTrace] Warning: No API key found. Trace will not be uploaded.")
            return

        def _upload():
            from .context import _capturing
            token = _capturing.set(True)
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
            finally:
                _capturing.reset(token)

        if Config.mode == "replay":
            # 🛑 Replay mode is strictly read-only. We never emit new telemetry during simulation.
            return

        if Config.mode == "record":
            # 🔒 Synchronous send. Keeps the execution strictly single-threaded.
            _upload()
        else:
            # Non-blocking background thread
            thread = threading.Thread(target=_upload, daemon=True)
            thread.start()
