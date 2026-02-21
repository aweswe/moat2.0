import time
import random
import datetime
import json
import uuid
import sys
import copy
import os

class ReplayMismatchError(Exception):
    """Raised when the replayed codebase diverges from the recorded trace."""
    pass

class DeterminismLeakError(Exception):
    """Raised when the agent attempts unmanaged I/O (bypass) during deterministic replay."""
    pass

class DeterministicInterceptor:
    """
    The core engine for "Choice 1" Deterministic Execution - Governance Tier.
    In 'record' mode: Captures I/O boundaries.
    In 'replay' mode: Enforces a closed-world sandbox with universal clock, PRNG, and I/O freezing.
    """
    def __init__(self, mode="record", replay_events=None):
        from .config import Config
        self.mode = mode
        self.governance_level = getattr(Config, "governance_level", "relaxed")
        # Use deepcopy to prevent shared state leakage in parallel replays
        self.replay_events = copy.deepcopy(replay_events) if replay_events else []
        self.cursor = 0  
        self.original_funcs = {}

    def _handle_leak(self, message):
        """Standardized handler for causal leaks."""
        if self.governance_level == "governance":
            raise DeterminismLeakError(f"[AgentTrace] Sandbox Violation: {message}")
        else:
            print(f"[AgentTrace] WARNING: Causal Leak Detected - {message}")
    
    def setup(self):
        """Applies the runtime patches."""
        if self.mode == "record":
            print("[AgentTrace] Initializing Network Capture (Record Mode).")
            self._patch_network_record()
        elif self.mode == "replay":
            print(f"[AgentTrace] Initializing governance sandbox. Events: {len(self.replay_events)}")
            from .validator import validate_trace_integrity
            validate_trace_integrity(self.replay_events)
            
            self._patch_environment() 
            self._patch_time()
            self._patch_randomness()
            self._patch_network_replay()
            self._patch_boundary_execution()
            self._patch_filesystem() # Phase 7: File I/O lockdown
            self._patch_entropy()    # Phase 7: Entropy lockdown
        
    def teardown(self):
        """Removes the runtime patches and verifies exact consumption."""
        print("[AgentTrace] Tearing down Deterministic Sandbox/Recorder.")
        self._restore_boundaries()
        self._restore_time()
        self._restore_randomness()
        self._restore_network()
        
        if self.mode == "replay":
            for evt in self.replay_events[self.cursor:]:
                evt_type = evt.get("type")
                if evt_type in ("network_call", "tool_call"):
                    raise ReplayMismatchError(
                        f"[AgentTrace] Sandbox Divergence: Unconsumed I/O event at seq {evt.get('seq')}."
                    )

    # --- Environment Lockdown ---
    def _patch_environment(self):
        """Verifies major environment drift (os.environ, sys.argv)."""
        if not self.replay_events: return
        payload = self.replay_events[0].get("payload", {})
        recorded_env = payload.get("env", {})
        for key in ["PYTHONHASHSEED", "TZ", "LANG"]:
            if key in recorded_env:
                actual_val = os.environ.get(key)
                if actual_val != recorded_env[key]:
                    print(f"[AgentTrace] Warning: Env Drift '{key}'. Trace: '{recorded_env[key]}', Actual: '{actual_val}'")

    # --- Time Freezing ---
    def _patch_time(self):
        import time
        import datetime
        if not self.replay_events: return
        initial_epoch = self.replay_events[0].get("timestamp_epoch", time.time())

        self.original_funcs["time.time"] = time.time
        self.original_funcs["time.perf_counter"] = time.perf_counter
        self.original_funcs["time.monotonic"] = time.monotonic
        self.original_funcs["time.process_time"] = time.process_time
        self.original_funcs["time.thread_time"] = time.thread_time
        self.original_funcs["datetime.datetime.now"] = datetime.datetime.now
        self.original_funcs["datetime.datetime.utcnow"] = datetime.datetime.utcnow

        def mocked_time():
            if self.cursor < len(self.replay_events):
                return self.replay_events[self.cursor].get("timestamp_epoch", initial_epoch)
            return initial_epoch

        time.time = mocked_time
        time.perf_counter = lambda: mocked_time() - initial_epoch
        time.monotonic = time.perf_counter
        time.process_time = time.perf_counter
        time.thread_time = time.perf_counter
        
        class MockDateTime(datetime.datetime):
            @classmethod
            def now(cls, tz=None): return datetime.datetime.fromtimestamp(mocked_time(), tz)
            @classmethod
            def utcnow(cls): return datetime.datetime.fromtimestamp(mocked_time())
        datetime.datetime = MockDateTime

    def _restore_time(self):
        import time
        import datetime
        keys = ["time.time", "time.perf_counter", "time.monotonic", "time.process_time", "time.thread_time"]
        for k in keys:
            if k in self.original_funcs:
                setattr(time, k.split('.')[1], self.original_funcs[k])
        if "datetime.datetime.now" in self.original_funcs:
            datetime.datetime = self.original_funcs["datetime.datetime.now"].__self__ # type: ignore

    # --- Randomness & Entropy Lockdown ---
    def _patch_randomness(self):
        master_seed = 42
        if self.replay_events and self.replay_events[0].get("type") == "agent_start":
            master_seed = self.replay_events[0].get("payload", {}).get("seed", 42)
        random.seed(master_seed)
        self.original_funcs["uuid.uuid4"] = uuid.uuid4
        uuid.uuid4 = lambda: uuid.UUID(int=random.getrandbits(128), version=4)
        try:
            import numpy as np
            np.random.seed(master_seed)
        except ImportError: pass

    def _patch_entropy(self):
        import os
        self.original_funcs["os.urandom"] = os.urandom
        def mocked_urandom(n):
            self._handle_leak("Raw entropy leak (os.urandom)")
            return self.original_funcs["os.urandom"](n) if self.governance_level == "relaxed" else None
        os.urandom = mocked_urandom
        
        # Patch secrets module if already imported
        if "secrets" in sys.modules:
            import secrets
            self.original_funcs["secrets.token_bytes"] = secrets.token_bytes
            self.original_funcs["secrets.token_hex"] = secrets.token_hex
            self.original_funcs["secrets.token_urlsafe"] = secrets.token_urlsafe
            secrets.token_bytes = mocked_urandom
            secrets.token_hex = lambda n=None: mocked_urandom(n or 32).hex()
            secrets.token_urlsafe = lambda n=None: mocked_urandom(n or 32).hex() # Simplified

        # Patch random.SystemRandom
        import random
        self.original_funcs["random.SystemRandom"] = random.SystemRandom
        class MockSystemRandom(random.SystemRandom):
            def random(self): 
                self.outer._handle_leak("SystemRandom leak")
                return super().random()
            def getrandbits(self, k): 
                self.outer._handle_leak("SystemRandom leak")
                return super().getrandbits(k)
        
        # We need a way to pass 'self' to the class
        MockSystemRandom.outer = self
        random.SystemRandom = MockSystemRandom

    def _patch_filesystem(self):
        import builtins
        import os
        self.original_funcs["builtins.open"] = builtins.open
        self.original_funcs["os.listdir"] = os.listdir
        def mocked_open(*args, **kwargs):
            self._handle_leak(f"File I/O ({args[0] if args else 'unknown'})")
            return self.original_funcs["builtins.open"](*args, **kwargs)
        builtins.open = mocked_open
        
        def mocked_listdir(path='.'):
            self._handle_leak(f"listdir ({path})")
            return self.original_funcs["os.listdir"](path)
        os.listdir = mocked_listdir

    def _restore_randomness(self):
        import random
        if "uuid.uuid4" in self.original_funcs: uuid.uuid4 = self.original_funcs["uuid.uuid4"]
        if "os.urandom" in self.original_funcs: os.urandom = self.original_funcs["os.urandom"]
        if "random.SystemRandom" in self.original_funcs: random.SystemRandom = self.original_funcs["random.SystemRandom"]
        if "secrets" in sys.modules:
            import secrets
            if "secrets.token_bytes" in self.original_funcs:
                secrets.token_bytes = self.original_funcs["secrets.token_bytes"]
                secrets.token_hex = self.original_funcs["secrets.token_hex"]
                secrets.token_urlsafe = self.original_funcs["secrets.token_urlsafe"]

    # --- Network & Boundary ---
    def _patch_network_record(self):
        try:
            import urllib3
            import urllib3.connectionpool
            from .context import _push_event
            self.original_funcs["urllib3.urlopen"] = urllib3.connectionpool.HTTPConnectionPool.urlopen
            def recording_urlopen(pool_self, method, url, body=None, headers=None, **kwargs):
                full_url = f"{pool_self.scheme}://{pool_self.host}:{pool_self.port}{url}"
                if "/api/trace" in full_url:
                    return self.original_funcs["urllib3.urlopen"](pool_self, method, url, body=body, headers=headers, **kwargs)
                res = self.original_funcs["urllib3.urlopen"](pool_self, method, url, body=body, headers=headers, **kwargs)
                res_data = res.data if hasattr(res, 'data') else res.read()
                try: res_body_str = res_data.decode("utf-8")
                except:
                    import base64
                    res_body_str = base64.b64encode(res_data).decode("utf-8")
                _push_event({
                    "seq": 0, "type": "network_call", "timestamp_epoch": time.time(),
                    "payload": {"method": method, "url": full_url, "status": res.status, "response": res_body_str}
                })
                return res
            urllib3.connectionpool.HTTPConnectionPool.urlopen = recording_urlopen
        except ImportError: pass

    def _patch_network_replay(self):
        try:
            import urllib3.connectionpool
            def mocked_urlopen_urllib3(pool_self, method, url, body=None, headers=None, **kwargs):
                full_url = f"{pool_self.scheme}://{pool_self.host}:{pool_self.port}{url}"
                matched_event = self._consume_network_event(method, full_url, body)
                return self._make_mocked_urllib3_response(matched_event, full_url)
            urllib3.connectionpool.HTTPConnectionPool.urlopen = mocked_urlopen_urllib3
        except ImportError: pass

    def _consume_network_event(self, method, url, body=None):
        while self.cursor < len(self.replay_events):
            evt = self.replay_events[self.cursor]
            if evt.get("type") in ("network_call", "tool_call"): break
            self.cursor += 1
        if self.cursor >= len(self.replay_events):
            raise ReplayMismatchError(f"[AgentTrace] Sandbox Divergence: Unexpected network {method} {url}")
        evt = self.replay_events[self.cursor]
        if url != evt.get("payload", {}).get("url", ""):
            raise ReplayMismatchError(f"[AgentTrace] Sandbox Divergence: Expected '{evt.get('payload', {}).get('url')}'")
        self.cursor += 1
        return evt

    def _make_mocked_urllib3_response(self, matched_event, full_url):
        payload = matched_event.get("payload", {})
        data = payload.get("response", "{}")
        if isinstance(data, str):
            try: data = data.encode("utf-8")
            except:
                import base64
                data = base64.b64decode(data)
        from urllib3.response import HTTPResponse
        import io
        return HTTPResponse(body=io.BytesIO(data), status=payload.get("status", 200), preload_content=False)

    def _patch_boundary_execution(self):
        import socket, subprocess
        self.original_funcs["socket.getaddrinfo"] = socket.getaddrinfo
        self.original_funcs["socket.socket.connect"] = socket.socket.connect
        
        def mocked_getaddrinfo(*args, **kwargs):
            self._handle_leak("DNS leak")
            return self.original_funcs["socket.getaddrinfo"](*args, **kwargs)
        socket.getaddrinfo = mocked_getaddrinfo

        def mocked_connect(sock_self, address):
            self._handle_leak(f"Socket leak ({address})")
            return self.original_funcs["socket.socket.connect"](sock_self, address)
        socket.socket.connect = mocked_connect

        self.original_funcs["subprocess.Popen"] = subprocess.Popen
        def mocked_popen(*args, **kwargs):
            self._handle_leak(f"Subprocess leak ({args[0] if args else 'unknown'})")
            return self.original_funcs["subprocess.Popen"](*args, **kwargs)
        subprocess.Popen = mocked_popen

    def _restore_boundaries(self):
        import socket, subprocess, builtins, os
        if "socket.getaddrinfo" in self.original_funcs: socket.getaddrinfo = self.original_funcs["socket.getaddrinfo"]
        if "socket.socket.connect" in self.original_funcs: socket.socket.connect = self.original_funcs["socket.socket.connect"]
        if "subprocess.Popen" in self.original_funcs: subprocess.Popen = self.original_funcs["subprocess.Popen"]
        if "builtins.open" in self.original_funcs: builtins.open = self.original_funcs["builtins.open"]
        if "os.listdir" in self.original_funcs: os.listdir = self.original_funcs["os.listdir"]

    def _restore_network(self):
        try:
            import urllib3.connectionpool
            if "urllib3.urlopen" in self.original_funcs:
                urllib3.connectionpool.HTTPConnectionPool.urlopen = self.original_funcs["urllib3.urlopen"]
        except ImportError: pass
