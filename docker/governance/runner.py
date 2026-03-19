import sys
import os
import json
import importlib
import traceback
import struct
import time

# Verify Python version matching the Docker image constraint strictly
if sys.version_info[:2] != (3, 12):
    sys.exit(1)

# Ensure AGENTTRACE_SIGNING_KEY is injected at runtime
SIGNING_KEY = os.environ.get("AGENTTRACE_SIGNING_KEY")
if not SIGNING_KEY:
    print('{"status": "fail", "error": "AGENTTRACE_SIGNING_KEY missing from environment", "fingerprint": null, "divergences": [], "duration_ms": 0}')
    sys.exit(1)

# File paths are strictly mapped to the isolated volume constraints
INPUT_TRACE_PATH = "/traces/input/trace.json"
OUTPUT_RESULT_PATH = "/traces/output/result.json"

sys.path.insert(0, "/app")
from agenttrace.config import Config
from agenttrace.interceptor import DeterministicInterceptor, DeterminismLeakError, ReplayMismatchError
from agenttrace.validator import validate_trace_integrity
from agenttrace.signer import verify_trace

def main():
    start_time = time.time()
    result = {
        "status": "fail",
        "fingerprint": None,
        "divergences": [],
        "error": None,
        "duration_ms": 0
    }
    
    try:
        if not os.path.exists(INPUT_TRACE_PATH):
            raise FileNotFoundError(f"Input trace missing at {INPUT_TRACE_PATH}")

        with open(INPUT_TRACE_PATH, 'r', encoding='utf-8') as f:
            trace_payload = json.load(f)

        signature = trace_payload.get("signature")
        if not signature:
            raise ValueError("Trace is missing a cryptographic signature.")

        events = trace_payload.get("events", [])
        
        # Validate baseline signature over trace events
        verify_trace(events, SIGNING_KEY, signature)

        # Validate sequence ordering integrity inside agenttrace.validator
        validate_trace_integrity(events)
        
        # Enforce Governance-level mode globally
        Config.governance_level = "governance"
        Config.mode = "replay"

        # Instantiate interceptor
        interceptor = DeterministicInterceptor(mode="replay", replay_events=events, governance_level="governance")
        interceptor.setup()

        # Isolate targeted module & run function natively in the sandbox securely
        target_module_name = trace_payload.get("agent_module")
        target_function_name = trace_payload.get("agent_fn")

        if not target_module_name or not target_function_name:
            raise ValueError("Trace metadata missing agent_module or agent_fn.")

        # Temporarily append the trace script dir to sys.path so the module imports resolve natively
        input_directory = os.path.dirname(INPUT_TRACE_PATH)
        if input_directory not in sys.path:
            sys.path.insert(0, input_directory)

        agent_module = importlib.import_module(target_module_name)
        agent_fn = getattr(agent_module, target_function_name)

        # Sandbox execution
        import asyncio
        if asyncio.iscoroutinefunction(agent_fn):
            asyncio.run(agent_fn())
        else:
            agent_fn()
            
        interceptor.teardown()
        
        from agenttrace.context import fingerprint_hash
        result["status"] = "pass"
        result["fingerprint"] = fingerprint_hash()

    except ReplayMismatchError as e:
        result["status"] = "fail"
        result["error"] = str(e)
        result["divergences"].append({"type": "ReplayMismatch", "detail": str(e)})

    except DeterminismLeakError as e:
        result["status"] = "fail"
        result["error"] = str(e)
        result["divergences"].append({"type": "DeterminismLeak", "detail": str(e)})

    except Exception as e:
        result["status"] = "fail"
        result["error"] = traceback.format_exc()

    finally:
        result["duration_ms"] = int((time.time() - start_time) * 1000)
        os.makedirs(os.path.dirname(OUTPUT_RESULT_PATH), exist_ok=True)
        with open(OUTPUT_RESULT_PATH, 'w', encoding='utf-8') as f:
            json.dump(result, f)

        # Output exit code gracefully mapped to execution validity
        sys.exit(0 if result["status"] == "pass" else 1)

if __name__ == "__main__":
    main()
