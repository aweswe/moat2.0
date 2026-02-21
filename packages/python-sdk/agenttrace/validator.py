from typing import List, Dict, Any

class TraceIntegrityError(Exception):
    """Raised when a recorded trace is structurally malformed."""
    pass

def validate_trace_integrity(events: List[Dict[str, Any]]):
    """
    Brutal pre-replay validation.
    Ensures:
    1. No duplicate sequence numbers.
    2. Strictly monotonic increase starting from 0.
    3. No gaps in sequence.
    """
    if not events:
        return # Empty trace is allowed (though useless)
        
    seen_seqs = set()
    max_seq = -1
    
    for i, event in enumerate(events):
        seq = event.get("seq")
        if seq is None:
            raise TraceIntegrityError(f"Event at index {i} is missing 'seq' field.")
            
        if not isinstance(seq, int):
            raise TraceIntegrityError(f"Event at index {i} has non-integer 'seq': {seq}")
            
        if seq in seen_seqs:
            raise TraceIntegrityError(f"Duplicate sequence number detected: {seq}")
            
        seen_seqs.add(seq)
        if seq > max_seq:
            max_seq = seq
            
    # Verify range coverage
    expected_range = set(range(len(events)))
    missing = expected_range - seen_seqs
    if missing:
        raise TraceIntegrityError(f"Trace has sequence gaps. Missing sequence numbers: {sorted(list(missing))}")
        
    if max_seq != len(events) - 1:
        # This is logically covered by the range check above, but for clarity:
        raise TraceIntegrityError(f"Trace sequence is non-contiguous. Max seq is {max_seq} but event count is {len(events)}")

    print(f"[AgentTrace] Trace Integrity Verified. {len(events)} events, strict sequence [0-{max_seq}].")
