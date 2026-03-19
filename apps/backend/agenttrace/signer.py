import hmac
import hashlib
import json

def sign_trace(events: list, key: str) -> str:
    """HMAC-SHA256 over canonical JSON (events sorted by seq, keys sorted). Returns hex digest."""
    # Ensure events are sorted by their sequence number to maintain canonical stability
    sorted_events = sorted(events, key=lambda e: e.get("seq", 0))
    # Serialize to canonical JSON (no spaces, sorted dictionaries)
    canonical_json = json.dumps(sorted_events, separators=(",", ":"), sort_keys=True)
    # Compute the HMAC-SHA256 digest
    signature = hmac.new(
        key.encode("utf-8"),
        canonical_json.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return signature

def verify_trace(events: list, key: str, signature: str) -> bool:
    """Constant-time comparison. Raises ValueError if invalid."""
    expected = sign_trace(events, key)
    # Use hmac.compare_digest to prevent timing attacks
    if not hmac.compare_digest(expected, signature):
        raise ValueError("Trace signature validation failed: The trace has been tampered with or the signature is invalid.")
    return True
