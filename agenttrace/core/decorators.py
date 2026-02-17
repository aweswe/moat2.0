from functools import wraps
import time
from .tracer import Tracer, Mode

def step(name_or_func=None):
    """Decorator for tracking sub-steps of an agent execution."""
    def decorator(func):
        if not callable(func):
            return func
            
        # Determine name: from argument or function name
        # If name_or_func is the func (direct @step), use its __name__
        # If name_or_func is a string (@step("name")), use the string
        step_name = name_or_func if isinstance(name_or_func, str) else getattr(func, "__name__", "unknown_step")
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            tracer = Tracer.get_instance()
            tracer.record_event("step_start", {"name": step_name})
            try:
                result = func(*args, **kwargs)
                tracer.record_event("step_end", {"name": step_name, "result": result})
                return result
            except Exception as e:
                tracer.record_event("step_failed", {"name": step_name, "error": str(e)})
                raise
        return wrapper
    
    # Handle @step vs @step("name")
    if callable(name_or_func):
        return decorator(name_or_func)
    return decorator


def tool(func):
    """Decorator for tracking tool calls with latency measurement."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        tracer = Tracer.get_instance()
        tool_name = getattr(func, "__name__", "unknown_tool")
        start_time = time.perf_counter()
        
        # Record the invocation
        tracer.record_event("tool_invocation", {
            "tool": tool_name, 
            "args": str(args), 
            "kwargs": str(kwargs)
        })
        
        # What-If Event Injection: Atomic check + consume + record
        # NEW: Add detailed debugging
        if tracer.mode == Mode.RECORD:
            print(f"[Tool:{tool_name}] Checking for injection...")
            print(f"[Tool:{tool_name}] event_override: {getattr(tracer, 'event_override', None) is not None}")
            print(f"[Tool:{tool_name}] event_overrides keys: {list(getattr(tracer, 'event_overrides', {}).keys())}")
        
        injected, result = tracer.try_consume_injected_result(tool_name)
        if injected:
            print(f"[Tool:{tool_name}] ✅ Injection applied: {result}")
            return result
        
        # Normal execution with latency tracking
        try:
            result = func(*args, **kwargs)
            latency_ms = (time.perf_counter() - start_time) * 1000
            
            tracer.record_event("tool_end", {
                "tool": tool_name, 
                "result": result,
                "latency_ms": round(latency_ms, 2)
            })
            return result
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            tracer.record_event("tool_failed", {
                "tool": tool_name, 
                "error": e,
                "latency_ms": round(latency_ms, 2)
            })
            raise
    return wrapper


# Token pricing per 1M tokens (USD) - configurable
LLM_PRICING = {
    "gpt-4": {"input": 30.0, "output": 60.0},
    "gpt-4-turbo": {"input": 10.0, "output": 30.0},
    "gpt-4o": {"input": 2.5, "output": 10.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.6},
    "gpt-3.5-turbo": {"input": 0.5, "output": 1.5},
    "claude-3-opus": {"input": 15.0, "output": 75.0},
    "claude-3-sonnet": {"input": 3.0, "output": 15.0},
    "claude-3-haiku": {"input": 0.25, "output": 1.25},
    "claude-3.5-sonnet": {"input": 3.0, "output": 15.0},
    "default": {"input": 1.0, "output": 3.0}
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD for a given model and token counts."""
    pricing = LLM_PRICING.get(model, LLM_PRICING["default"])
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


def llm_tool(model: str = "default"):
    """Decorator for LLM calls with token and cost tracking."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            tracer = Tracer.get_instance()
            tool_name = getattr(func, "__name__", "unknown_llm")
            start_time = time.perf_counter()
            
            # Record invocation
            tracer.record_event("llm_invocation", {
                "tool": tool_name,
                "model": model,
                "args": str(args),
                "kwargs": str(kwargs)
            })
            
            # What-If injection check
            injected, result = tracer.try_consume_injected_result(tool_name)
            if injected:
                return result
            
            # Execute LLM call
            try:
                result = func(*args, **kwargs)
                latency_ms = (time.perf_counter() - start_time) * 1000
                
                # Warn if result is not in expected format
                if not isinstance(result, dict):
                    print(f"[AgentTrace] Warning: @llm_tool expects dict return, got {type(result).__name__}")
                    tracer.record_event("llm_end", {
                        "tool": tool_name,
                        "model": model,
                        "result": str(result),
                        "latency_ms": round(latency_ms, 2),
                        "warning": "Non-dict return, cost tracking disabled"
                    })
                    return result
                
                # Extract token counts from result
                input_tokens = result.get("input_tokens", 0)
                output_tokens = result.get("output_tokens", 0)
                
                total_tokens = input_tokens + output_tokens
                cost_usd = calculate_cost(model, input_tokens, output_tokens)
                
                tracer.record_event("llm_end", {
                    "tool": tool_name,
                    "model": model,
                    "result": result.get("content", result) if isinstance(result, dict) else result,
                    "latency_ms": round(latency_ms, 2),
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens,
                    "cost_usd": cost_usd
                })
                
                return result
            except Exception as e:
                latency_ms = (time.perf_counter() - start_time) * 1000
                tracer.record_event("llm_failed", {
                    "tool": tool_name,
                    "model": model,
                    "error": str(e),
                    "latency_ms": round(latency_ms, 2)
                })
                raise
        return wrapper
    return decorator


def trace(name_or_func=None):
    """Decorator for tracking a full agent execution."""
    def decorator(func):
        if not callable(func):
            return func
            
        # Determine name: from argument or function name
        trace_name = name_or_func if isinstance(name_or_func, str) else getattr(func, "__name__", "agent_trace")
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            tracer = Tracer.get_instance()
            start_time = time.perf_counter()
            
            tracer.record_event("function_start", {
                "name": trace_name, 
                "args": str(args), 
                "kwargs": str(kwargs)
            })
            
            try:
                result = func(*args, **kwargs)
                latency_ms = (time.perf_counter() - start_time) * 1000
                
                tracer.record_event("function_end", {
                    "name": trace_name, 
                    "result": result,
                    "latency_ms": round(latency_ms, 2)
                })
                return result
            except Exception as e:
                latency_ms = (time.perf_counter() - start_time) * 1000
                tracer.record_event("function_failed", {
                    "name": trace_name, 
                    "error": str(e),
                    "latency_ms": round(latency_ms, 2)
                })
                raise
        return wrapper
        
    if callable(name_or_func):
        return decorator(name_or_func)
    return decorator
