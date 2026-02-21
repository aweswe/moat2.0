import time
import uuid
import inspect
from functools import wraps
from typing import Any, Callable, Dict, Optional, ContextManager

from .context import _trace_ctx, _step_ctx, _get_or_create_trace, _push_event, _get_active_step
from .client import AgentTraceClient

def run(name: Optional[str] = None):
    """
    Decorator to wrap an agent's main execution loop.
    Captures all steps executed within, and uploads them as one Trace.
    """
    def decorator(func: Callable):
        is_async = inspect.iscoroutinefunction(func)
        agent_name = name or func.__name__

        # Auto-capture source code at decoration time
        try:
            _source_code = inspect.getsource(func)
        except (OSError, TypeError):
            _source_code = ""
        
        # Also try to capture the entire file
        try:
            _source_file = inspect.getfile(func)
            with open(_source_file, "r", encoding="utf-8") as f:
                _full_file_source = f.read()
        except (OSError, TypeError):
            _full_file_source = _source_code

        if is_async:
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                from .context import _trace_ctx, _push_event
                from .config import Config
                from .interceptor import DeterministicInterceptor
                import threading

                # Early-bird Sandbox Init (Phase 7 Hardening)
                # Auto-setup config from env vars in case user didn't explicitly call agenttrace.init()
                Config.setup()
                interceptor = DeterministicInterceptor(mode=Config.mode, replay_events=Config.replay_events)
                interceptor.setup()

                trace_id = str(uuid.uuid4())
                trace_data = {
                    "trace_id": trace_id,
                    "metadata": {
                        "title": f"Run: {agent_name}",
                        "status": "in_progress",
                        "tags": ["python-sdk"]
                    },
                    "events": [],
                    "event_count": 0,
                    "lock": threading.Lock(),
                    "spans": [{
                        "span_id": str(uuid.uuid4()),
                        "name": f"agent.{agent_name}",
                        "kind": "server",
                        "start_time": time.time(),
                        "attributes": {}
                    }],
                    "source_code": _full_file_source
                }
                
                # Setup context
                token = _trace_ctx.set(trace_data)
                start_time_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                
                if Config.mode == "record":
                    import random
                    import os
                    import sys
                    seed = random.randint(0, 1000000)
                    random.seed(seed)
                    
                    # Capture filtered environment for drift detection
                    # We only capture keys that affect determinism/behavior (excluding secrets)
                    env_keys = ["PYTHONHASHSEED", "TZ", "LANG", "LC_ALL", "PATH"]
                    captured_env = {k: os.environ.get(k) for k in env_keys if k in os.environ}
                    captured_argv = sys.argv
                else:
                    seed = Config.replay_events[0].get("payload", {}).get("seed", 42) if Config.replay_events else 42
                    captured_env = {}
                    captured_argv = []

                _push_event({
                    "seq": 0,
                    "type": "agent_start",
                    "timestamp": start_time_iso,
                    "timestamp_epoch": time.time(),
                    "payload": {
                        "agent": agent_name, 
                        "args": repr(args), 
                        "seed": seed,
                        "env": captured_env,
                        "argv": captured_argv
                    }
                })
                
                try:
                    result = await func(*args, **kwargs)
                    status = "completed"
                except Exception as e:
                    status = "failed"
                    _push_event({
                        "seq": trace_data["event_count"],
                        "type": "error",
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                        "timestamp_epoch": time.time(),
                        "payload": {"error_type": type(e).__name__, "message": str(e)}
                    })
                    raise e
                finally:
                    # Final event
                    _push_event({
                        "seq": trace_data["event_count"],
                        "type": "agent_complete",
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                        "timestamp_epoch": time.time(),
                        "payload": {"status": status, "return_value": repr(result) if 'result' in locals() else None}
                    })
                    
                    end_time = time.time()
                    start_time_raw = trace_data["spans"][0]["start_time"]
                    trace_data["spans"][0]["start_time"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(start_time_raw))
                    trace_data["spans"][0]["end_time"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(end_time))
                    trace_data["metadata"]["status"] = status
                    trace_data["metadata"]["event_count"] = trace_data["event_count"]
                    trace_data["metadata"]["duration_s"] = round(end_time - start_time_raw, 2)
                    trace_data.pop("lock", None)
                    
                    # Submit to background client
                    from .config import Config
                    if Config.mode == "record":
                        AgentTraceClient.send_trace(trace_data)
                    else:
                        import hashlib, json as _json
                        events_consumed = len(Config.replay_events)
                        replay_payload = _json.dumps(
                            [{k: v for k, v in e.items() if k != "timestamp"} for e in trace_data["events"]],
                            sort_keys=True, separators=(",", ":")
                        )
                        replay_hash = hashlib.sha256(replay_payload.encode()).hexdigest()[:16]
                        print(f"[AgentTrace] Replay consumed {events_consumed} events from trace. Fingerprint: {replay_hash}")

                        
                    _trace_ctx.reset(token)
                    interceptor.teardown()
                    
                return result
            return async_wrapper
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                from .context import _trace_ctx, _push_event
                from .config import Config
                from .interceptor import DeterministicInterceptor
                import threading
                
                # Early-bird Sandbox Init (Phase 7 Hardening)
                # Auto-setup config from env vars in case user didn't explicitly call agenttrace.init()
                Config.setup()
                interceptor = DeterministicInterceptor(mode=Config.mode, replay_events=Config.replay_events)
                interceptor.setup()

                trace_id = str(uuid.uuid4())
                trace_data = {
                    "trace_id": trace_id,
                    "metadata": {
                        "title": f"Run: {agent_name}",
                        "status": "in_progress",
                        "tags": ["python-sdk"]
                    },
                    "events": [],
                    "event_count": 0,
                    "lock": threading.Lock(),
                    "spans": [{
                        "span_id": str(uuid.uuid4()),
                        "name": f"agent.{agent_name}",
                        "kind": "server",
                        "start_time": time.time(),
                        "attributes": {}
                    }],
                    "source_code": _full_file_source
                }
                
                token = _trace_ctx.set(trace_data)
                start_time_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                
                if Config.mode == "record":
                    import random
                    import os
                    import sys
                    seed = random.randint(0, 1000000)
                    random.seed(seed)
                    env_keys = ["PYTHONHASHSEED", "TZ", "LANG", "LC_ALL", "PATH"]
                    captured_env = {k: os.environ.get(k) for k in env_keys if k in os.environ}
                    captured_argv = sys.argv
                else:
                    seed = Config.replay_events[0].get("payload", {}).get("seed", 42) if Config.replay_events else 42
                    captured_env = {}
                    captured_argv = []

                _push_event({
                    "seq": 0,
                    "type": "agent_start",
                    "timestamp": start_time_iso,
                    "timestamp_epoch": time.time(),
                    "payload": {
                        "agent": agent_name, 
                        "args": repr(args), 
                        "seed": seed,
                        "env": captured_env,
                        "argv": captured_argv
                    }
                })
                
                try:
                    result = func(*args, **kwargs)
                    status = "completed"
                except Exception as e:
                    status = "failed"
                    _push_event({
                        "seq": trace_data["event_count"],
                        "type": "error",
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                        "timestamp_epoch": time.time(),
                        "payload": {"error_type": type(e).__name__, "message": str(e)}
                    })
                    raise e
                finally:
                    _push_event({
                        "seq": trace_data["event_count"],
                        "type": "agent_complete",
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                        "timestamp_epoch": time.time(),
                        "payload": {"status": status, "return_value": repr(result) if 'result' in locals() else None}
                    })
                    
                    end_time = time.time()
                    start_time_raw = trace_data["spans"][0]["start_time"]
                    trace_data["spans"][0]["start_time"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(start_time_raw))
                    trace_data["spans"][0]["end_time"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(end_time))
                    trace_data["metadata"]["status"] = status
                    trace_data["metadata"]["event_count"] = trace_data["event_count"]
                    trace_data["metadata"]["duration_s"] = round(end_time - start_time_raw, 2)
                    trace_data.pop("lock", None)
                    
                    from .config import Config
                    if Config.mode == "record":
                        AgentTraceClient.send_trace(trace_data)
                    else:
                        import hashlib, json as _json
                        events_consumed = len(Config.replay_events)
                        replay_payload = _json.dumps(
                            [{k: v for k, v in e.items() if k != "timestamp"} for e in trace_data["events"]],
                            sort_keys=True, separators=(",", ":")
                        )
                        replay_hash = hashlib.sha256(replay_payload.encode()).hexdigest()[:16]
                        print(f"[AgentTrace] Replay consumed {events_consumed} events from trace. Fingerprint: {replay_hash}")

                        
                    _trace_ctx.reset(token)
                    interceptor.teardown()
                    
                return result
            return sync_wrapper

    if callable(name):
        func = name
        name = None
        return decorator(func)
    return decorator


class step:
    """
    Context manager to log an intermediate step.
    Usage:
        with agenttrace.step("Process Order", type="tool_call", input={"order": 1}):
            ... # do stuff
            agenttrace.set_result(result_dict)
    """
    def __init__(self, name: str, type: str = "observation", **kwargs):
        self.name = name
        self.type = type
        self.payload = {"name": name, **kwargs}
        self.token = None
        
    def __enter__(self):
        ctx = _get_or_create_trace()
        self.step_data = {
            "seq": ctx["event_count"],
            "type": self.type,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "timestamp_epoch": time.time(),
            "payload": self.payload
        }
        ctx["event_count"] += 1
        
        # Store in context so inner code can update results
        self.token = _step_ctx.set(self.step_data)
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.step_data["type"] = "error"
            self.step_data["payload"]["error"] = str(exc_val)
            
        trace = _get_or_create_trace()
        trace["events"].append(self.step_data)
        _step_ctx.reset(self.token)

def set_result(result_data: Any):
    """Update the current step with a final result."""
    current_step = _get_active_step()
    if current_step:
        current_step["payload"]["result"] = result_data
