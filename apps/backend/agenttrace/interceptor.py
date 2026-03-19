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
        # Pool for matching out-of-order events (async/threads)
        self.unconsumed_events = copy.deepcopy(self.replay_events)
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
            self._patch_boundary_execution()  # Install socket proxy for recording
        elif self.mode == "replay":
            print(f"[AgentTrace] Initializing {self.governance_level} sandbox. Events: {len(self.replay_events)}")
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
            # Any remaining unconsumed critical events imply divergence
            for evt in self.unconsumed_events:
                evt_type = evt.get("type")
                if evt_type in ("network_call", "tool_call", "socket_call"):
                    msg = f"[AgentTrace] Sandbox Divergence: Unconsumed I/O event {evt_type} at seq {evt.get('seq')}."
                    if self.governance_level == "governance":
                        raise ReplayMismatchError(msg)
                    else:
                        print(f"WARNING: {msg}")

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
                    msg = f"Env Drift '{key}'. Trace: '{recorded_env[key]}', Actual: '{actual_val}'"
                    if self.governance_level == "governance":
                        print(f"[AgentTrace] Governance Error: {msg}")
                    else:
                        print(f"[AgentTrace] Warning: {msg}")

    # --- Time Freezing ---
    def _patch_time(self):
        import time
        import datetime
        if not self.replay_events: return
        initial_epoch = self.replay_events[0].get("timestamp_epoch", time.time())

        self.original_funcs["time.time"] = time.time
        self.original_funcs["datetime.datetime.now"] = datetime.datetime.now
        self.original_funcs["datetime.datetime.utcnow"] = datetime.datetime.utcnow

        def mocked_time():
            # For time, we just return the initial stable epoch to ensure determinism
            return initial_epoch

        time.time = mocked_time
        
        class MockDateTime(datetime.datetime):
            @classmethod
            def now(cls, tz=None): return datetime.datetime.fromtimestamp(mocked_time(), tz)
            @classmethod
            def utcnow(cls): return datetime.datetime.fromtimestamp(mocked_time())
        datetime.datetime = MockDateTime

    def _restore_time(self):
        import time
        import datetime
        keys = ["time.time"]
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
        
        if "secrets" in sys.modules:
            import secrets
            self.original_funcs["secrets.token_bytes"] = secrets.token_bytes
            self.original_funcs["secrets.token_hex"] = secrets.token_hex
            self.original_funcs["secrets.token_urlsafe"] = secrets.token_urlsafe
            secrets.token_bytes = mocked_urandom
            secrets.token_hex = lambda n=None: mocked_urandom(n or 32).hex()
            secrets.token_urlsafe = lambda n=None: mocked_urandom(n or 32).hex() 

        import random
        self.original_funcs["random.SystemRandom"] = random.SystemRandom
        class MockSystemRandom(random.SystemRandom):
            def random(self): 
                self.outer._handle_leak("SystemRandom leak")
                return super().random()
            def getrandbits(self, k): 
                self.outer._handle_leak("SystemRandom leak")
                return super().getrandbits(k)
        MockSystemRandom.outer = self
        random.SystemRandom = MockSystemRandom

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

    # --- Network & Boundary ---
    def _patch_network_record(self):
        # 1. urllib3 (requests)
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

        # 2. httpx (used by OpenAI, Anthropic, Groq)
        try:
            import httpx
            from .context import _push_event
            
            # Sync Client
            self.original_funcs["httpx.Client.send"] = httpx.Client.send
            def recording_httpx_send(client_self, request, **kwargs):
                full_url = str(request.url)
                if "/api/trace" in full_url:
                    return self.original_funcs["httpx.Client.send"](client_self, request, **kwargs)
                res = self.original_funcs["httpx.Client.send"](client_self, request, **kwargs)
                res.read()
                try:
                    res_body_str = res.content.decode("utf-8")
                except:
                    import base64
                    res_body_str = base64.b64encode(res.content).decode("utf-8")
                _push_event({
                    "seq": 0, "type": "network_call", "timestamp_epoch": time.time(),
                    "payload": {"method": request.method, "url": full_url, "status": res.status_code, "response": res_body_str}
                })
                return res
            httpx.Client.send = recording_httpx_send

            # Async Client 
            self.original_funcs["httpx.AsyncClient.send"] = httpx.AsyncClient.send
            async def recording_httpx_send_async(client_self, request, **kwargs):
                full_url = str(request.url)
                if "/api/trace" in full_url:
                    return await self.original_funcs["httpx.AsyncClient.send"](client_self, request, **kwargs)
                res = await self.original_funcs["httpx.AsyncClient.send"](client_self, request, **kwargs)
                await res.aread()
                try: res_body_str = res.content.decode("utf-8")
                except:
                    import base64
                    res_body_str = base64.b64encode(res.content).decode("utf-8")
                _push_event({
                    "seq": 0, "type": "network_call", "timestamp_epoch": time.time(),
                    "payload": {"method": request.method, "url": full_url, "status": res.status_code, "response": res_body_str}
                })
                return res
            httpx.AsyncClient.send = recording_httpx_send_async
        except ImportError: pass

    def _patch_network_replay(self):
        # 1. urllib3 lookup
        try:
            import urllib3.connectionpool
            def mocked_urlopen_urllib3(pool_self, method, url, body=None, headers=None, **kwargs):
                full_url = f"{pool_self.scheme}://{pool_self.host}:{pool_self.port}{url}"
                matched_event = self._consume_network_event(method, full_url, body)
                return self._make_mocked_urllib3_response(matched_event, full_url)
            urllib3.connectionpool.HTTPConnectionPool.urlopen = mocked_urlopen_urllib3
        except ImportError: pass
        
        # 2. httpx lookup
        try:
            import httpx
            def mocked_httpx_send(client_self, request, **kwargs):
                full_url = str(request.url)
                matched_event = self._consume_network_event(request.method, full_url, request.content)
                return self._make_mocked_httpx_response(matched_event, request)
            httpx.Client.send = mocked_httpx_send

            async def mocked_httpx_send_async(client_self, request, **kwargs):
                full_url = str(request.url)
                matched_event = self._consume_network_event(request.method, full_url, request.content)
                return self._make_mocked_httpx_response(matched_event, request)
            httpx.AsyncClient.send = mocked_httpx_send_async
        except ImportError: pass

    def _consume_network_event(self, method, url, body=None):
        from .context import _get_step_name
        current_step = _get_step_name()
        
        # Search for a matching event in the pool
        match_idx = -1
        for i, evt in enumerate(self.unconsumed_events):
            if evt.get("type") == "network_call":
                payload = evt.get("payload", {})
                # Strictly match Method + URL + Step Context
                if payload.get("method") == method and payload.get("url") == url:
                    # In async/threads, we prefer exact step matches
                    if payload.get("step") == current_step:
                        match_idx = i
                        break
                    # Fallback: if no exact step match found yet, keep looking or take first URL match as last resort
                    elif match_idx == -1:
                        match_idx = i

        if match_idx == -1:
            msg = f"Unexpected network {method} {url} in step '{current_step}'"
            if self.governance_level == "governance":
                raise ReplayMismatchError(f"[AgentTrace] Sandbox Divergence: {msg}")
            else:
                print(f"[AgentTrace] WARNING: {msg}")
                return {"payload": {"status": 200, "response": "{}"}}
        
        return self.unconsumed_events.pop(match_idx)

    def _consume_socket_event(self, op, address):
        from .context import _get_step_name
        current_step = _get_step_name()
        
        match_idx = -1
        for i, evt in enumerate(self.unconsumed_events):
            payload = evt.get("payload", {})
            if evt.get("type") == "socket_call" and payload.get("op") == op:
                # Normalize address for comparison (json converts tuples to lists)
                recorded_addr = payload.get("address")
                if isinstance(recorded_addr, list): recorded_addr = tuple(recorded_addr)
                runtime_addr = address
                if isinstance(runtime_addr, list): runtime_addr = tuple(runtime_addr)

                if recorded_addr == runtime_addr:
                    if payload.get("step") == current_step:
                        match_idx = i
                        break
                    elif match_idx == -1:
                        match_idx = i
        
        if match_idx == -1:
            msg = f"Unexpected socket {op} to {address} in step '{current_step}'"
            if self.governance_level == "relaxed":
                print(f"[AgentTrace] WARNING: {msg}")
                return None
            raise ReplayMismatchError(f"[AgentTrace] Sandbox Divergence: {msg}")
        
        return self.unconsumed_events.pop(match_idx)

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

    def _make_mocked_httpx_response(self, matched_event, request):
        payload = matched_event.get("payload", {})
        data = payload.get("response", "{}")
        if isinstance(data, str):
            try: data = data.encode("utf-8")
            except:
                import base64
                data = base64.b64decode(data)
        import httpx
        res = httpx.Response(
            status_code=payload.get("status", 200),
            content=data,
            request=request,
        )
        return res

    def _patch_boundary_execution(self):
        import socket, subprocess
        self.original_funcs["socket.getaddrinfo"] = socket.getaddrinfo
        self.original_funcs["socket.socket"] = socket.socket
        
        outer = self
        original_socket_cls = self.original_funcs["socket.socket"]

        if self.mode == "record":
            # --- RECORD MODE: Method-level monkey-patching ---
            # Patch connect/send/recv on the socket class prototype to record events
            # without replacing the class itself (keeps httpx, SSL, etc. working).
            original_connect = socket.socket.connect
            original_send = socket.socket.send
            original_sendall = socket.socket.sendall
            original_recv = socket.socket.recv
            original_recv_into = socket.socket.recv_into
            original_close = socket.socket.close
            
            # Track socket addresses by socket id (thread-safe enough for our purposes)
            # Memory leak prevented by clearing on close()
            _socket_addresses = {}

            def recording_connect(sock_self, address):
                from .context import _capturing, _get_step_name, _push_event
                _socket_addresses[id(sock_self)] = address
                if not _capturing.get():
                    try:
                        _push_event({
                            "seq": 0, "type": "socket_call", "timestamp_epoch": time.time(),
                            "payload": {
                                "op": "connect",
                                "address": list(address) if isinstance(address, (list, tuple)) else address,
                                "step": _get_step_name()
                            }
                        })
                    except Exception:
                        pass
                return original_connect(sock_self, address)

            def recording_send(sock_self, data, flags=0):
                from .context import _capturing, _get_step_name, _push_event
                res = original_send(sock_self, data, flags)
                if not _capturing.get():
                    try:
                        import base64
                        addr = _socket_addresses.get(id(sock_self))
                        _push_event({
                            "type": "socket_call",
                            "payload": {
                                "op": "send",
                                "address": list(addr) if isinstance(addr, (list, tuple)) else addr,
                                "data": base64.b64encode(data).decode("utf-8"),
                                "step": _get_step_name()
                            }
                        })
                    except Exception:
                        pass
                return res

            def recording_sendall(sock_self, data, flags=0):
                from .context import _capturing, _get_step_name, _push_event
                res = original_sendall(sock_self, data, flags)
                if not _capturing.get():
                    try:
                        import base64
                        addr = _socket_addresses.get(id(sock_self))
                        _push_event({
                            "type": "socket_call",
                            "payload": {
                                "op": "send",
                                "address": list(addr) if isinstance(addr, (list, tuple)) else addr,
                                "data": base64.b64encode(data).decode("utf-8"),
                                "step": _get_step_name()
                            }
                        })
                    except Exception:
                        pass
                return res

            def recording_recv(sock_self, buflen, flags=0):
                from .context import _capturing, _get_step_name, _push_event
                data = original_recv(sock_self, buflen, flags)
                if not _capturing.get():
                    try:
                        import base64
                        addr = _socket_addresses.get(id(sock_self))
                        _push_event({
                            "type": "socket_call",
                            "payload": {
                                "op": "recv",
                                "address": list(addr) if isinstance(addr, (list, tuple)) else addr,
                                "data": base64.b64encode(data).decode("utf-8"),
                                "step": _get_step_name()
                            }
                        })
                    except Exception:
                        pass
                return data

            def recording_recv_into(sock_self, buffer, nbytes=0, flags=0):
                from .context import _capturing, _get_step_name, _push_event
                res = original_recv_into(sock_self, buffer, nbytes, flags)
                if not _capturing.get() and res > 0:
                    try:
                        import base64
                        addr = _socket_addresses.get(id(sock_self))
                        # buffer might be larger than res, only capture the written part
                        data_read = bytes(memoryview(buffer)[:res])
                        _push_event({
                            "type": "socket_call",
                            "payload": {
                                "op": "recv",
                                "address": list(addr) if isinstance(addr, (list, tuple)) else addr,
                                "data": base64.b64encode(data_read).decode("utf-8"),
                                "step": _get_step_name()
                            }
                        })
                    except Exception:
                        pass
                return res

            def recording_close(sock_self):
                # Prevent memory leaks in production tracker
                _socket_addresses.pop(id(sock_self), None)
                return original_close(sock_self)



            socket.socket.connect = recording_connect
            socket.socket.send = recording_send
            socket.socket.sendall = recording_sendall
            socket.socket.recv = recording_recv
            socket.socket.recv_into = recording_recv_into
            socket.socket.close = recording_close
            
            self.original_funcs["socket.socket.connect"] = original_connect
            self.original_funcs["socket.socket.send"] = original_send
            self.original_funcs["socket.socket.sendall"] = original_sendall
            self.original_funcs["socket.socket.recv"] = original_recv
            self.original_funcs["socket.socket.recv_into"] = original_recv_into
            self.original_funcs["socket.socket.close"] = original_close

        elif self.mode == "replay":
            # --- REPLAY MODE: Pure delegation proxy ---
            class AgentTraceSocketProxy:
                def __init__(self, family=socket.AF_INET, type=socket.SOCK_STREAM, proto=0, fileno=None):
                    self._sock = original_socket_cls(family, type, proto, fileno)
                    self._address = None

                def connect(self, address):
                    self._address = address
                    outer._consume_socket_event("connect", address)
                    return None

                def send(self, data, flags=0):
                    outer._consume_socket_event("send", self._address)
                    return len(data)

                def sendall(self, data, flags=0):
                    self.send(data, flags)

                def recv(self, buflen, flags=0):
                    address = self._address
                    evt = outer._consume_socket_event("recv", address)
                    if evt:
                        import base64
                        return base64.b64decode(evt["payload"]["data"])
                    return b""
                    
                def recv_into(self, buffer, nbytes=0, flags=0):
                    data = self.recv(nbytes if nbytes else len(buffer), flags)
                    length = len(data)
                    buffer[:length] = data
                    return length

                def close(self):
                    return self._sock.close()
                    
                def makefile(self, mode='r', buffering=None, *, encoding=None, errors=None, newline=None):
                    import io
                    return io.BytesIO()

                def __enter__(self):
                    return self
                    
                def __exit__(self, *args):
                    self.close()

                def __getattr__(self, name):
                    return getattr(self._sock, name)

            socket.socket = AgentTraceSocketProxy

            def mocked_getaddrinfo(*args, **kwargs):
                self._handle_leak("DNS leak")
                return self.original_funcs["socket.getaddrinfo"](*args, **kwargs)
            
            socket.getaddrinfo = mocked_getaddrinfo

            self.original_funcs["subprocess.Popen"] = subprocess.Popen
            def mocked_popen(*args, **kwargs):
                self._handle_leak(f"Subprocess leak ({args[0] if args else 'unknown'})")
                return self.original_funcs["subprocess.Popen"](*args, **kwargs)
            subprocess.Popen = mocked_popen


    def _restore_boundaries(self):
        import socket, subprocess, builtins, os
        if "socket.getaddrinfo" in self.original_funcs: socket.getaddrinfo = self.original_funcs["socket.getaddrinfo"]
        if "socket.socket" in self.original_funcs: socket.socket = self.original_funcs["socket.socket"]
        # Restore method-level patches (record mode)
        if "socket.socket.connect" in self.original_funcs: socket.socket.connect = self.original_funcs["socket.socket.connect"]
        if "socket.socket.send" in self.original_funcs: socket.socket.send = self.original_funcs["socket.socket.send"]
        if "socket.socket.sendall" in self.original_funcs: socket.socket.sendall = self.original_funcs["socket.socket.sendall"]
        if "socket.socket.recv" in self.original_funcs: socket.socket.recv = self.original_funcs["socket.socket.recv"]
        if "socket.socket.recv_into" in self.original_funcs: socket.socket.recv_into = self.original_funcs["socket.socket.recv_into"]
        if "socket.socket.close" in self.original_funcs: socket.socket.close = self.original_funcs["socket.socket.close"]
        if "subprocess.Popen" in self.original_funcs: subprocess.Popen = self.original_funcs["subprocess.Popen"]
        if "builtins.open" in self.original_funcs: builtins.open = self.original_funcs["builtins.open"]
        if "os.listdir" in self.original_funcs: os.listdir = self.original_funcs["os.listdir"]

    def _restore_network(self):
        try:
            import urllib3.connectionpool
            if "urllib3.urlopen" in self.original_funcs:
                urllib3.connectionpool.HTTPConnectionPool.urlopen = self.original_funcs["urllib3.urlopen"]
        except ImportError: pass
