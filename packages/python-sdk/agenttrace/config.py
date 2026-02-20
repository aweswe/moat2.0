import os

class Config:
    api_key: str = None
    api_url: str = "https://moat-kappa.vercel.app/api"  # Use env var or default
    
    @classmethod
    def setup(cls, api_key: str = None, api_url: str = None):
        cls.api_key = api_key or os.environ.get("AGENTTRACE_API_KEY")
        if api_url:
            cls.api_url = api_url
        elif os.environ.get("AGENTTRACE_API_URL"):
            cls.api_url = os.environ.get("AGENTTRACE_API_URL")

def init(api_key: str = None, api_url: str = None):
    """
    Initialize the AgentTrace SDK.
    
    Args:
        api_key: Your AgentTrace API key (prefix `at_live_`). If not provided,
                 will look for the AGENTTRACE_API_KEY environment variable.
        api_url: The AgentTrace API URL (default: api.agenttrace.com)
    """
    Config.setup(api_key, api_url)
