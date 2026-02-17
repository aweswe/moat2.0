"""
State Restorer - Applies snapshot state during replay.
"""
import sys
import threading
import ctypes

def install_state_restorer(state):
    """
    Install a sys.settrace hook that waits for the target frame and restores
    globals/locals before execution continues.
    """
    if not state:
        return

    target_file = state.get("filename")
    target_func = state.get("function")
    target_line = state.get("line")
    globals_state = state.get("globals", {})
    locals_state = state.get("locals", {})

    if not target_file:
        return

    from agenttrace.runtime.hydrator import DeepHydrator
    restored = {"done": False}

    def _apply_state(frame):
        # Update globals
        if globals_state:
            frame.f_globals.update(globals_state)
        
        # Update locals using Deep Hydration
        if locals_state:
            DeepHydrator.hydrate(frame.f_locals, locals_state)
            
            try:
                ctypes.pythonapi.PyFrame_LocalsToFast(
                    ctypes.py_object(frame), ctypes.c_int(0)
                )
            except Exception:
                pass

    def tracer(frame, event, arg):
        if restored["done"]:
            return None

        try:
            filename = frame.f_code.co_filename
            func_name = frame.f_code.co_name
            lineno = frame.f_lineno

            matches_file = filename == target_file
            matches_func = (target_func is None) or (func_name == target_func)

            if matches_file and matches_func:
                if target_line is None or lineno >= target_line:
                    _apply_state(frame)
                    restored["done"] = True
                    sys.settrace(None)
                    threading.settrace(None)
                    return None
        except Exception:
            # Fail silently; we don't want to break user code
            pass

        return tracer

    sys.settrace(tracer)
    threading.settrace(tracer)


