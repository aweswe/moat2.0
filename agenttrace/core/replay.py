# agenttrace/core/replay.py
import json
from typing import List, Any, Dict
from agenttrace.core.vfs_bridge import VFS_FILES, vfs_write

def load_parent_events(supabase_client, parent_trace_id: str) -> List[Dict[str, Any]]:
    """Download and parse parent events.jsonl from storage."""
    path = f"{parent_trace_id}/events.jsonl"
    try:
        blob = supabase_client.storage.from_("traces").download(path)
        if not blob:
            print(f"⚠ load_parent_events: no events.jsonl for {parent_trace_id}")
            return []
        text = blob.decode() if isinstance(blob, (bytes, bytearray)) else blob.text()
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        events = []
        for line in lines:
            try:
                ev = json.loads(line)
                events.append(ev)
            except Exception:
                continue
        events.sort(key=lambda e: e.get("seq", e.get("step", 0)))
        return events
    except Exception as e:
        print(f"⚠ load_parent_events error: {e}")
        return []


def apply_event_to_state(state: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    """
    EXHAUSTIVE delta applier - handles ALL event types.
    NO pickle bailouts.
    """
    state = dict(state or {})
    t = event.get("type", "")
    payload = event.get("payload", {}) or {}
    seq = event.get("seq", -1)
    
    # ============================================
    # SECTION 1: EXECUTION FLOW TRACKING
    # ============================================
    
    if t == "step_start":
        state.setdefault("_call_stack", [])
        state["_call_stack"].append({
            "type": "step",
            "name": payload.get("name"),
            "seq": seq
        })
        state["step"] = state.get("step", 0) + 1
    
    elif t == "step_end":
        if state.get("_call_stack"):
            state["_call_stack"].pop()
    
    elif t == "step_failed":
        state.setdefault("_failures", [])
        state["_failures"].append({
            "seq": seq,
            "step": payload.get("name"),
            "error": payload.get("error")
        })
        if state.get("_call_stack"):
            state["_call_stack"].pop()
    
    # ============================================
    # SECTION 2: FUNCTION/TRACE TRACKING
    # ============================================
    
    elif t == "function_start":
        state.setdefault("_call_stack", [])
        state["_call_stack"].append({
            "type": "function",
            "name": payload.get("name"),
            "seq": seq,
            "args": payload.get("args"),
            "kwargs": payload.get("kwargs")
        })
    
    elif t == "function_end":
        if state.get("_call_stack"):
            state["_call_stack"].pop()
        state.setdefault("_execution_log", [])
        state["_execution_log"].append({
            "seq": seq,
            "function": payload.get("name"),
            "result": payload.get("result"),
            "latency_ms": payload.get("latency_ms")
        })
    
    elif t == "function_failed":
        state.setdefault("_failures", [])
        state["_failures"].append({
            "seq": seq,
            "function": payload.get("name"),
            "error": payload.get("error")
        })
        if state.get("_call_stack"):
            state["_call_stack"].pop()
    
    # ============================================
    # SECTION 3: TOOL INVOCATIONS
    # ============================================
    
    elif t == "tool_invocation":
        state.setdefault("_pending_tools", {})
        tool_name = payload.get("tool", "unknown")
        state["_pending_tools"][tool_name] = {
            "seq": seq,
            "args": payload.get("args"),
            "kwargs": payload.get("kwargs"),
            "started_at": event.get("timestamp")
        }
    
    elif t == "tool_end":
        tool_name = payload.get("tool", "unknown")
        
        # Remove from pending
        if state.get("_pending_tools", {}).get(tool_name):
            del state["_pending_tools"][tool_name]
        
        # Store result in memory
        state.setdefault("memory", {})
        state["memory"].setdefault("tools", {})
        state["memory"]["tools"][tool_name] = {
            "result": payload.get("result"),
            "latency_ms": payload.get("latency_ms"),
            "seq": seq,
            "injected": payload.get("injected", False)
        }
        
        # Track in execution log
        state.setdefault("_execution_log", [])
        state["_execution_log"].append({
            "seq": seq,
            "type": "tool",
            "tool": tool_name,
            "result": payload.get("result"),
            "injected": payload.get("injected", False)
        })
    
    elif t == "tool_failed":
        tool_name = payload.get("tool", "unknown")
        
        if state.get("_pending_tools", {}).get(tool_name):
            del state["_pending_tools"][tool_name]
        
        state.setdefault("_failures", [])
        state["_failures"].append({
            "seq": seq,
            "tool": tool_name,
            "error": payload.get("error"),
            "latency_ms": payload.get("latency_ms")
        })
    
    # ============================================
    # SECTION 4: LLM CALLS (WITH COST TRACKING)
    # ============================================
    
    elif t == "llm_invocation":
        state.setdefault("_pending_llm_calls", [])
        state["_pending_llm_calls"].append({
            "seq": seq,
            "tool": payload.get("tool"),
            "model": payload.get("model"),
            "started_at": event.get("timestamp")
        })
    
    elif t == "llm_end":
        if state.get("_pending_llm_calls"):
            state["_pending_llm_calls"].pop()
        
        # Add message to conversation
        state.setdefault("messages", [])
        content = payload.get("result") or payload.get("content")
        if content:
            state["messages"].append({
                "role": "assistant",
                "content": str(content),
                "seq": seq,
                "model": payload.get("model")
            })
        
        # Track token usage and costs
        state.setdefault("_llm_metrics", {
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_cost_usd": 0.0,
            "calls_by_model": {}
        })
        
        model = payload.get("model", "unknown")
        input_tokens = payload.get("input_tokens", 0)
        output_tokens = payload.get("output_tokens", 0)
        cost_usd = payload.get("cost_usd", 0.0)
        
        metrics = state["_llm_metrics"]
        metrics["total_input_tokens"] += input_tokens
        metrics["total_output_tokens"] += output_tokens
        metrics["total_cost_usd"] += cost_usd
        
        if model not in metrics["calls_by_model"]:
            metrics["calls_by_model"][model] = {
                "count": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cost_usd": 0.0
            }
        
        metrics["calls_by_model"][model]["count"] += 1
        metrics["calls_by_model"][model]["input_tokens"] += input_tokens
        metrics["calls_by_model"][model]["output_tokens"] += output_tokens
        metrics["calls_by_model"][model]["cost_usd"] += cost_usd
    
    elif t == "llm_failed":
        if state.get("_pending_llm_calls"):
            state["_pending_llm_calls"].pop()
        
        state.setdefault("_failures", [])
        state["_failures"].append({
            "seq": seq,
            "type": "llm",
            "tool": payload.get("tool"),
            "model": payload.get("model"),
            "error": payload.get("error")
        })
    
    # ============================================
    # SECTION 5: MESSAGES (LEGACY SUPPORT)
    # ============================================
    
    elif t in ("message", "message_append", "llm_call"):
        state.setdefault("messages", [])
        
        if "messages" in payload:
            state["messages"].extend(payload["messages"])
        elif "message" in payload:
            state["messages"].append(payload["message"])
        elif isinstance(payload, str):
            state["messages"].append({"role": "assistant", "content": payload})
    
    # ============================================
    # SECTION 6: VFS OPERATIONS (FILE SYSTEM)
    # ============================================
    
    elif t == "file_write":
        state.setdefault("_vfs", {})
        path = payload.get("path")
        content = payload.get("content")
        if path:
            state["_vfs"][path] = {
                "content": content,
                "seq": seq,
                "timestamp": event.get("timestamp")
            }
            # Physical sync to the VFS bridge (authoritative normalization)
            vfs_write(path, content)
    
    elif t == "file_read":
        state.setdefault("_file_reads", [])
        state["_file_reads"].append({
            "seq": seq,
            "path": payload.get("path"),
            "timestamp": event.get("timestamp")
        })

    elif t == "file_rename" or t == "dir_rename":
        state.setdefault("_vfs", {})
        old_path = payload.get("old")
        new_path = payload.get("new")
        if old_path and new_path:
            # Reconstruct in VFS bridge
            from agenttrace.core.vfs_bridge import vfs_rename
            try:
                vfs_rename(old_path, new_path)
                # Update state tracking if exists
                if old_path in state["_vfs"]:
                    state["_vfs"][new_path] = state["_vfs"].pop(old_path)
            except: pass

    elif t == "file_remove":
        state.setdefault("_vfs", {})
        path = payload.get("path")
        if path:
            from agenttrace.core.vfs_bridge import vfs_remove
            try:
                vfs_remove(path)
                if path in state["_vfs"]:
                    del state["_vfs"][path]
            except: pass

    elif t == "makedirs":
        # Usually just creates dirs, no content to track in state['_vfs']
        # But we could ensure bridge is aware if needed
        pass

    elif t == "rmdir":
        # Similar to remove but for dirs
        pass
    
    # ============================================
    # SECTION 7: STATE UPDATES (GENERIC)
    # ============================================
    
    elif t == "state_update":
        if isinstance(payload, dict):
            for k, v in payload.items():
                if k not in ("log", "debug", "_internal"):
                    state[k] = v
    
    # ============================================
    # SECTION 8: EXCEPTIONS/ERRORS
    # ============================================
    
    elif t == "python_exception":
        state.setdefault("_failures", [])
        state["_failures"].append({
            "seq": seq,
            "error_type": payload.get("error_type"),
            "message": payload.get("message"),
            "traceback": payload.get("traceback")
        })
    
    # ============================================
    # SECTION 9: RUNTIME STATE (DETERMINISM)
    # ============================================
    
    elif t == "trace_start":
        # Restore RNG seeds for deterministic replay
        runtime = payload.get("runtime", {})
        
        py_rng = runtime.get("py_random")
        if py_rng is not None:
            try:
                import random
                random.setstate(tuple(py_rng))
            except Exception as e:
                print(f"⚠ Failed to restore Python RNG: {e}")
        
        numpy_rng = runtime.get("numpy_random")
        if numpy_rng is not None:
            try:
                import numpy as np
                np.random.set_state(numpy_rng)
            except Exception as e:
                print(f"⚠ Failed to restore NumPy RNG: {e}")
    
    # ============================================
    # SECTION 10: TOOL RESULTS (LEGACY)
    # ============================================
    
    elif t == "tool_result":
        state.setdefault("memory", {})
        state["memory"].setdefault("tools", {})
        tool_name = payload.get("tool_name") or payload.get("tool", "unknown")
        state["memory"]["tools"][tool_name] = payload.get("result")
    
    # ============================================
    # SECTION 11: FALLBACK (LOG UNKNOWN)
    # ============================================
    
    else:
        state.setdefault("_unknown_events", [])
        state["_unknown_events"].append({
            "seq": seq,
            "type": t,
            "payload": payload
        })
        # print(f"⚠ Unknown event type: {t} (seq {seq})")
        pass
    
    return state


def hydrate_state_from_events(base_state: Dict[str, Any], events: List[Dict[str, Any]], target_step: int) -> Dict[str, Any]:
    """
    Fast-forward through events to reconstruct state at target_step.
    """
    state = dict(base_state or {})
    
    for ev in events:
        seq = ev.get("seq", ev.get("step", None))
        if seq is None:
            continue
        if seq > target_step:
            break
        
        state = apply_event_to_state(state, ev)
    
    return state
