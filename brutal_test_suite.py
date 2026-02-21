import os
import sys
import json
import socket
import subprocess
import urllib.request
from pathlib import Path

# Add SDK to path
sys.path.insert(0, str(Path("packages/python-sdk").absolute()))

import agenttrace
from agenttrace.interceptor import DeterminismLeakError, ReplayMismatchError

def test_dns_leak():
    print("\n--- Test A: DNS Leakage ---")
    # 1. Record a simple trace
    agenttrace.init(api_key="test", mode="record")
    
    @agenttrace.run("dns_test")
    def run_agent():
        print("Live run...")
    
    run_agent()
    
    # 2. Replay and attempt DNS
    trace_id = "dns_test" # In local mode, trace_id is usually the title or random
    # Actually, we can just mock the replay events
    events = [{"type": "agent_start", "seq": 0}]
    
    interceptor = agenttrace.interceptor.DeterministicInterceptor(mode="replay", replay_events=events)
    interceptor.setup()
    
    try:
        print("Attempting socket.gethostbyname...")
        socket.gethostbyname("google.com")
        print("FAILED: DNS leak not blocked!")
    except DeterminismLeakError as e:
        print(f"SUCCESS: DNS leak blocked: {e}")
    finally:
        interceptor.teardown()

def test_subprocess_escape():
    print("\n--- Test B: Subprocess Escape ---")
    events = [{"type": "agent_start", "seq": 0}]
    interceptor = agenttrace.interceptor.DeterministicInterceptor(mode="replay", replay_events=events)
    interceptor.setup()
    
    try:
        print("Attempting subprocess.run...")
        subprocess.run(["echo", "hello"])
        print("FAILED: Subprocess not blocked!")
    except DeterminismLeakError as e:
        print(f"SUCCESS: Subprocess blocked: {e}")
    finally:
        interceptor.teardown()

def test_unknown_network_call():
    print("\n--- Test 4: Hidden Network Call ---")
    # Trace only has agent_start
    events = [{"type": "agent_start", "seq": 0}]
    interceptor = agenttrace.interceptor.DeterministicInterceptor(mode="replay", replay_events=events)
    interceptor.setup()
    
    try:
        print("Attempting urllib.request.urlopen...")
        urllib.request.urlopen("https://example.com")
        print("FAILED: Unknown network call not blocked!")
    except ReplayMismatchError as e:
        print(f"SUCCESS: Unknown network call blocked: {e}")
    finally:
        interceptor.teardown()

def test_duplicate_seq():
    print("\n--- Test 10: Duplicate Sequence Detection ---")
    events = [{"type": "agent_start", "seq": 0}, {"type": "step", "seq": 0}]
    interceptor = agenttrace.interceptor.DeterministicInterceptor(mode="replay", replay_events=events)
    try:
        interceptor.setup()
        print("FAILED: Duplicate seq not blocked!")
    except agenttrace.validator.TraceIntegrityError as e:
        print(f"SUCCESS: Duplicate seq blocked: {e}")

def test_sequence_gap():
    print("\n--- Test 5: Sequence Gap Detection ---")
    events = [{"type": "agent_start", "seq": 0}, {"type": "step", "seq": 2}]
    interceptor = agenttrace.interceptor.DeterministicInterceptor(mode="replay", replay_events=events)
    try:
        interceptor.setup()
        print("FAILED: Trace gap not blocked!")
    except agenttrace.validator.TraceIntegrityError as e:
        print(f"SUCCESS: Trace gap blocked: {e}")

if __name__ == "__main__":
    try:
        test_dns_leak()
        test_subprocess_escape()
        test_unknown_network_call()
        test_duplicate_seq()
        test_sequence_gap()
        print("\n=== BRUTAL AUDIT PHASE 1 & 2 PASSED ===")
    except Exception as e:
        print(f"\nAudit failed with unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
