import uuid
import threading
from contextvars import ContextVar
from typing import Optional, Dict, Any, List

# Thread-safe global variables for async/sync mixed execution
_trace_ctx: ContextVar[Optional[Dict[str, Any]]] = ContextVar("agenttrace_trace_ctx", default=None)
_step_ctx: ContextVar[Optional[Dict[str, Any]]] = ContextVar("agenttrace_step_ctx", default=None)

def _get_or_create_trace() -> Dict[str, Any]:
    """Get the active trace context or create it safely."""
    ctx = _trace_ctx.get()
    if ctx is None:
        raise RuntimeError("AgentTrace is not active. Did you forget the @agenttrace.run decorator?")
    return ctx

def _get_active_step() -> Optional[Dict[str, Any]]:
    return _step_ctx.get()

def _push_event(event: Dict[str, Any]):
    from .config import Config
    if Config.mode == "replay":
        return
        
    trace = _get_or_create_trace()
    with trace["lock"]:
        trace["events"].append(event)
        trace["event_count"] += 1
