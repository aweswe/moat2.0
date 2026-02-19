"""
Exception Interceptor - Automatic error capture for AgentTrace
"""
import sys
import traceback
import inspect
from agenttrace.core.tracer import Tracer, Mode

def capture_exception(exc_type, exc_value, tb):
    """
    Manually capture an exception for AgentTrace.
    """
    tracer = Tracer.get_instance()
    
    # Only capture in RECORD mode
    if tracer.mode != Mode.RECORD:
        return

    _process_exception(exc_type, exc_value, tb)

def exception_interceptor(exc_type, exc_value, tb):
    """
    Global exception hook that captures all unhandled exceptions.
    This is called automatically when Python encounters an unhandled exception.
    """
    capture_exception(exc_type, exc_value, tb)
    # Always call default excepthook to print to stderr
    sys.__excepthook__(exc_type, exc_value, tb)

def _process_exception(exc_type, exc_value, tb):
    tracer = Tracer.get_instance()

    
    # Get the frame where the exception occurred
    if tb is not None:
        # Walk to the last traceback item to get the actual error location
        last_tb = tb
        while last_tb.tb_next is not None:
            last_tb = last_tb.tb_next
        
        frame = last_tb.tb_frame
        
        raw_locals = dict(frame.f_locals)
        raw_globals = {
            key: value
            for key, value in frame.f_globals.items()
            if not key.startswith("__") and not inspect.ismodule(value)
        }

        # Get full traceback
        stack = ''.join(traceback.format_exception(exc_type, exc_value, tb))
        
        # Get file and line number
        filename = frame.f_code.co_filename
        line_number = frame.f_lineno
        function_name = frame.f_code.co_name
    else:
        # Fallback if no traceback
        stack = str(exc_value)
        filename = "unknown"
        line_number = 0
        function_name = "unknown"
        raw_locals = {}
        raw_globals = {}
    
    # Record the exception event
    event_payload = _sanitize_for_event(
        exc_type,
        exc_value,
        stack,
        filename,
        line_number,
        function_name,
        raw_locals,
        raw_globals,
    )

    snapshot_state = {
        "locals": raw_locals,
        "globals": raw_globals,
        "filename": filename,
        "function": function_name,
        "line": line_number,
    }

    tracer.record_event(
        "python_exception",
        event_payload,
        state_snapshot=snapshot_state,
    )
    
    # Call original exception handler (prints to stderr)
    sys.__excepthook__(exc_type, exc_value, tb)

def install_exception_hook():
    """Install the global exception interceptor"""
    sys.excepthook = exception_interceptor

def uninstall_exception_hook():
    """Restore original exception handler"""
    sys.excepthook = sys.__excepthook__


def _sanitize_for_event(exc_type, exc_value, traceback_str, filename, line_number, function_name, locals_snapshot, globals_snapshot):
    """Return a JSON-safe payload for the event log"""
    def serialize(value):
        try:
            import json
            json.dumps(value)
            return value
        except Exception:
            return {
                "_type": type(value).__name__,
                "_repr": repr(value)[:100],
            }

    safe_locals = {k: serialize(v) for k, v in locals_snapshot.items()}
    safe_globals = {k: serialize(v) for k, v in globals_snapshot.items()}

    return {
        "error_type": exc_type.__name__,
        "message": str(exc_value),
        "traceback": traceback_str,
        "filename": filename,
        "line_number": line_number,
        "function_name": function_name,
        "locals": safe_locals,
        "globals": safe_globals,
    }

