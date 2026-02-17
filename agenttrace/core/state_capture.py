def capture_current_state(agent=None, checkpoint_mode: str = "DEFAULT") -> dict:
    """
    Capture the AGENT'S LOGICAL STATE.
    
    Args:
        agent: The agent instance to capture state from.
        checkpoint_mode: "DEFAULT" (with pickle) or "DELTA_ONLY" (JSON only).
    """

    if agent is None:
        return {
            "messages": [],
            "memory": {},
            "context": {},
            "step": None,
            "runtime": {
                "py_random": None,
                "numpy_random": None,
            }
        }

    # Optional numpy RNG capture
    try:
        import numpy as _np
        numpy_rng = _np.random.get_state()
    except Exception:
        numpy_rng = None

    # Optional Python RNG capture
    import random
    py_rng = random.getstate()

    # Deep State Capture (Pickle) - Skip if DELTA_ONLY
    deep_state_blob = None
    if checkpoint_mode != "DELTA_ONLY":
        try:
            import pickle
            import base64
            blob = pickle.dumps(agent)
            deep_state_blob = base64.b64encode(blob).decode('ascii')
        except Exception:
            deep_state_blob = None

    state = {
        "messages": getattr(agent, "messages", []),
        "memory": getattr(agent, "memory", {}),
        "context": getattr(agent, "context", {}),
        "step": getattr(agent, "step", None),
        "extra_state": getattr(agent, "extra_state", {}),
        "runtime": {
            "py_random": py_rng,
            "numpy_random": numpy_rng,
            "deep_state_blob": deep_state_blob
        }
    }

    return state
