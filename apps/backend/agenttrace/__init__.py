"""
AgentTrace Python SDK

A thin data-collection layer for AI agents.
"""

from .config import init
from .decorators import run, step, set_result

__version__ = "0.1.0"
__all__ = ["init", "run", "step", "set_result"]
