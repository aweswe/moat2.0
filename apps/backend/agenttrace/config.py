import os
import threading

_original_thread = threading.Thread

class DeterminismBlockedThread(_original_thread):
    def start(self):
        print(
            "[AgentTrace] Warning: Multi-threading detected in Replay mode. "
            "This can break determinism if threads perform un-intercepted I/O."
        )
        super().start()

def _block_threading():
    threading.Thread = DeterminismBlockedThread

class Config:
    api_key: str = None
    api_url: str = "https://www.theagenttrace.com/api"  # Use env var or default
    mode: str = "record"
    replay_events: list = []
    governance_level: str = "relaxed"
    _is_setup: bool = False
    
    @classmethod
    def setup(cls, api_key: str = None, api_url: str = None, mode: str = None, replay_events: list = None, governance_level: str = None):
        if cls._is_setup and not (api_key or api_url or mode or replay_events or governance_level):
            return

        # Priority: Argument > Env Var > Current Value > Default
        if api_key:
            cls.api_key = api_key
        elif not cls.api_key:
            cls.api_key = os.environ.get("AGENTTRACE_API_KEY")
            
        if api_url:
            cls.api_url = api_url
        elif not cls.api_url or cls.api_url == "https://www.theagenttrace.com/api":
            cls.api_url = os.environ.get("AGENTTRACE_API_URL") or "https://www.theagenttrace.com/api"
        
        if mode:
            cls.mode = mode
        elif os.environ.get("AGENTTRACE_MODE"):
            cls.mode = os.environ.get("AGENTTRACE_MODE")
        # Don't overwrite if already set to something non-default
        elif not cls.mode:
            cls.mode = "record"
            
        cls.governance_level = governance_level or os.environ.get("AGENTTRACE_GOVERNANCE_LEVEL") or cls.governance_level or "relaxed"

        if os.environ.get("AGENTTRACE_MODE"):
            cls.mode = os.environ.get("AGENTTRACE_MODE")
        else:
            cls.mode = mode or "record"
        
        if replay_events is not None:
            cls.replay_events = replay_events
        elif cls.mode == "replay" and not cls.replay_events and os.environ.get("AGENTTRACE_REPLAY_EVENTS_FILE"):
            events_file = os.environ.get("AGENTTRACE_REPLAY_EVENTS_FILE")
            import json
            if os.path.exists(events_file):
                with open(events_file, "r") as f:
                    raw = f.read()
                data = json.loads(raw)
                if isinstance(data, list):
                    cls.replay_events = data
                elif isinstance(data, dict):
                    cls.replay_events = data.get("events", [])
                else:
                    cls.replay_events = []
                if not cls.replay_events:
                    raise RuntimeError(f"[AgentTrace] Replay initialized with 0 events from {events_file} — invalid hydration.")
            else:
                raise RuntimeError(f"[AgentTrace] Events file not found: {events_file}")
            
        cls._is_setup = True


def init(api_key: str = None, api_url: str = None, mode: str = "record", replay_events: list = None):
    """
    Initialize the AgentTrace SDK.
    
    Args:
        api_key: Your AgentTrace API key (prefix `at_live_`). If not provided,
                 will look for the AGENTTRACE_API_KEY environment variable.
        api_url: The AgentTrace API URL (default: api.agenttrace.com)
        mode: "record" for live execution, "replay" for intercepted deterministic execution.
        replay_events: The array of previous trace events to feed the interceptor in replay mode.
    """
    Config.setup(api_key, api_url, mode, replay_events)
    if Config.mode == "replay":
        _block_threading()
