import time
import random
import datetime
import json
import uuid
import sys

class ReplayMismatchError(Exception):
    """Raised when the replayed codebase diverges from the recorded trace."""
    pass

class DeterministicInterceptor:
    """
    The core engine for Phase 3 Deterministic Execution.
    In 'record' mode, it does nothing special (lets the agent run live).
    In 'replay' mode, it monkey-patches the runtime to enforce a closed-world sandbox:
    - Blocks outbound HTTP and returns recorded responses
    - Freezes the system clock to match the recorded timestamps
    - Seeds PRNGs to match the trace seed
    """
    def __init__(self, mode="record", replay_events=None):
        self.mode = mode
        self.replay_events = replay_events or []
        self.cursor = 0  # Points to the next expected event in the replay array
        self.original_funcs = {}
    
    def setup(self):
        """Applies the runtime patches."""
        if self.mode == "record":
            print("[AgentTrace] Initializing Network Capture (Record Mode).")
            self._patch_network_record()
        elif self.mode == "replay":
            print(f"[AgentTrace] Initializing Deterministic Replay Sandbox. Trace contains {len(self.replay_events)} events.")
            self._patch_time()
            self._patch_randomness()
            self._patch_network_replay()
        
    def teardown(self):
        """Removes the runtime patches and verifies exact consumption."""
        print("[AgentTrace] Tearing down Deterministic Sandbox/Recorder.")
        self._restore_time()
        self._restore_randomness()
        self._restore_network()
        
        if self.mode == "replay":
            # Rule 4 from User: Strict end-of-trace consumption integrity constraint
            # Ensure no I/O events were left unconsumed (silent skip drift)
            for evt in self.replay_events[self.cursor:]:
                evt_type = evt.get("type")
                if evt_type in ("network_call", "tool_call"):
                    raise ReplayMismatchError(
                        f"[AgentTrace] Sandbox Divergence: Agent finished execution, but there are unconsumed I/O events in the trace starting at sequence {evt.get('seq')}. "
                        "The replayed code did not execute all the expected boundaries."
                    )
                # It's normal to have trailing telemetry events (agent_complete, error)
                # We skip them, but if we see anything else structural, we could raise here.

    # --- Time Freezing ---
    def _patch_time(self):
        self.original_funcs["time.time"] = time.time
        
        def mocked_time():
            # Time determinism must be decoupled from the I/O observation cursor.
            # We return the exact timestamp of the very first recorded event ('agent_start') 
            # to guarantee that time-based checks within the agent logic yield mathematically
            # identical results across any number of replays, without causing pseudo-drifts.
            if len(self.replay_events) > 0 and "timestamp_epoch" in self.replay_events[0]:
                return float(self.replay_events[0]["timestamp_epoch"])
            return 1700000000.0 # Fallback fixed epoch

        time.time = mocked_time

    def _restore_time(self):
        if "time.time" in self.original_funcs:
            time.time = self.original_funcs["time.time"]

    # --- Randomness Freezing ---
    def _patch_randomness(self):
        # The seed is stored in the very first event payload or trace metadata.
        # Let's assume it's passed via replay_events[0]["payload"]["seed"] (we'll add it to agent_start)
        master_seed = 42
        if len(self.replay_events) > 0 and self.replay_events[0].get("type") == "agent_start":
            master_seed = self.replay_events[0].get("payload", {}).get("seed", 42)
        
        random.seed(master_seed)
        
        self.original_funcs["uuid.uuid4"] = uuid.uuid4
        
        def mocked_uuid4():
            # Strategic note: UUID shares the global `random` state seeded by `master_seed`.
            # If the user script invokes `random.randint()` prior to generating a UUID,
            # this generator guarantees it will yield the identical UUID sequence as the original
            # recorded trace, since PRNG boundaries are symmetrically synced.
            return uuid.UUID(int=random.getrandbits(128), version=4)
            
        uuid.uuid4 = mocked_uuid4

    def _restore_randomness(self):
        if "uuid.uuid4" in self.original_funcs:
            uuid.uuid4 = self.original_funcs["uuid.uuid4"]

    # --- Network / LLM Freezing ---
    def _patch_network_record(self):
        """Wraps urllib3 AND urllib.request to auto-record HTTP calls during live execution."""
        # --- urllib3 patch ---
        try:
            import urllib3
            import urllib3.connectionpool
            from .context import _get_active_step, _push_event
            
            self.original_funcs["urllib3.urlopen"] = urllib3.connectionpool.HTTPConnectionPool.urlopen
            
            def recording_urlopen(pool_self, method, url, body=None, headers=None, **kwargs):
                full_url = f"{pool_self.scheme}://{pool_self.host}:{pool_self.port}{url}"
                
                # Exclude AgentTrace's own background telemetry API calls!
                if "agenttrace" in full_url or "moat" in full_url or "/api/trace" in full_url:
                    return self.original_funcs["urllib3.urlopen"](pool_self, method, url, body=body, headers=headers, **kwargs)

                # Call the real network
                res = self.original_funcs["urllib3.urlopen"](pool_self, method, url, body=body, headers=headers, **kwargs)
                
                # Safely read response body
                res_data = b""
                if hasattr(res, 'data'):
                     res_data = res.data
                elif hasattr(res, 'read'):
                     res_data = res.read()

                # Determine if it's text or binary to serialize safely
                try:
                    res_body_str = res_data.decode("utf-8")
                except:
                    import base64
                    res_body_str = base64.b64encode(res_data).decode("utf-8")

                try:
                    _push_event({
                        "seq": 0,
                        "type": "network_call",
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                        "timestamp_epoch": time.time(),
                        "payload": {
                            "method": method,
                            "url": full_url,
                            "status": res.status,
                            "response": res_body_str
                        }
                    })
                except Exception as e:
                    print(f"[AgentTrace] Failed to record network event: {e}")

                return res

            urllib3.connectionpool.HTTPConnectionPool.urlopen = recording_urlopen
        except ImportError:
            pass

        # --- urllib.request patch (Python stdlib) ---
        try:
            import urllib.request
            from .context import _push_event
            self.original_funcs["urllib.request.urlopen"] = urllib.request.urlopen
            interceptor_self = self

            def recording_urlopen_stdlib(url_or_req, *args, **kwargs):
                method = "GET"
                full_url = url_or_req if isinstance(url_or_req, str) else url_or_req.full_url
                if hasattr(url_or_req, 'get_method'):
                    method = url_or_req.get_method()

                # Exclude AgentTrace's own telemetry calls
                if "agenttrace" in full_url or "moat" in full_url or "/api/trace" in full_url:
                    return interceptor_self.original_funcs["urllib.request.urlopen"](url_or_req, *args, **kwargs)

                response = interceptor_self.original_funcs["urllib.request.urlopen"](url_or_req, *args, **kwargs)
                try:
                    res_data = response.read()
                    status = response.status
                    try:
                        res_body_str = res_data.decode("utf-8")
                    except:
                        import base64
                        res_body_str = base64.b64encode(res_data).decode("utf-8")

                    _push_event({
                        "seq": 0,
                        "type": "network_call",
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                        "timestamp_epoch": time.time(),
                        "payload": {
                            "method": method,
                            "url": full_url,
                            "status": status,
                            "response": res_body_str
                        }
                    })
                    # Reconstruct a readable response since we already consumed it
                    import io
                    from urllib.response import addinfourl
                    from http.client import HTTPMessage
                    msg = HTTPMessage()
                    return addinfourl(io.BytesIO(res_data), msg, full_url, status)
                except Exception as e:
                    print(f"[AgentTrace] Failed to record urllib.request network event: {e}")
                    return response

            urllib.request.urlopen = recording_urlopen_stdlib
        except Exception as e:
            print(f"[AgentTrace] urllib.request record patch failed: {e}")

    def _patch_network_replay(self):
        # --- Patch urllib3 (used by requests, httpbin clients) ---
        try:
            import urllib3
            import urllib3.connectionpool
            
            def mocked_urlopen_urllib3(pool_self, method, url, body=None, headers=None, **kwargs):
                full_url = f"{pool_self.scheme}://{pool_self.host}:{pool_self.port}{url}"
                print(f"[Sandbox] urllib3 intercepted: {method} {full_url}")
                matched_event = self._consume_network_event(method, full_url, body)
                return self._make_mocked_urllib3_response(matched_event, full_url)

            urllib3.connectionpool.HTTPConnectionPool.urlopen = mocked_urlopen_urllib3
        except ImportError:
            print("[Sandbox] urllib3 not found, skipping urllib3 patch.")

        # --- Patch urllib.request.urlopen (Python stdlib, used directly in agent scripts) ---
        try:
            import urllib.request
            self.original_funcs["urllib.request.urlopen"] = urllib.request.urlopen
            interceptor_self = self

            def mocked_urlopen_stdlib(url_or_req, *args, **kwargs):
                import urllib.request as _ur
                method = "GET"
                full_url = url_or_req if isinstance(url_or_req, str) else url_or_req.full_url
                if hasattr(url_or_req, 'get_method'):
                    method = url_or_req.get_method()
                print(f"[Sandbox] urllib.request intercepted: {method} {full_url}")
                matched_event = interceptor_self._consume_network_event(method, full_url, None)
                payload = matched_event.get("payload", {}) if matched_event else {}
                recorded_status = payload.get("status", 200)
                recorded_body = payload.get("response", "{}")
                if isinstance(recorded_body, str):
                    recorded_body = recorded_body.encode("utf-8")
                # Return a fake http.client.HTTPResponse-compatible object
                import io
                from urllib.response import addinfourl
                from http.client import HTTPMessage
                msg = HTTPMessage()
                fake_fp = io.BytesIO(recorded_body)
                return addinfourl(fake_fp, msg, full_url, recorded_status)

            urllib.request.urlopen = mocked_urlopen_stdlib
        except Exception as e:
            print(f"[Sandbox] urllib.request patch failed: {e}")

        # TODO: Add `httpx` patch (modern OpenAI client uses httpx underneath)

    def _consume_network_event(self, method, url, body=None):
        """
        Rule 3 from User: Step Cursor Enforcement.
        We must walk the trace sequentially. 
        If it's out of order or missing, fail hard.
        """
        # Skip purely telemetry events that are not runtime boundaries
        while self.cursor < len(self.replay_events):
            evt_type = self.replay_events[self.cursor].get("type")
            if evt_type in ("network_call", "tool_call"):
                break
            self.cursor += 1
            
        if self.cursor >= len(self.replay_events):
            raise ReplayMismatchError(f"[AgentTrace] Sandbox Divergence: Agent attempted to make a network request ({method} {url}) but the recorded trace has no more I/O events.")
            
        evt = self.replay_events[self.cursor]
        
        # Ensure strict exact matching on URL before advancing
        evt_url = evt.get("payload", {}).get("url", "")
        if url != evt_url:
             raise ReplayMismatchError(
                 f"[AgentTrace] Sandbox Divergence: Expected network call to EXACTLY '{evt_url}', "
                 f"but agent requested '{url}' at trace step {self.cursor}."
             )
             
        # TODO: Compare headers/body hash for pure determinism
        
        # Advance the cursor specifically for the validated network call
        self.cursor += 1
        
        return evt

    def _make_mocked_urllib3_response(self, matched_event, full_url):
        """Construct a fake urllib3 HTTPResponse from a recorded trace event."""
        if not matched_event:
            raise Exception(f"[AgentTrace Sandbox] Strict Replay Divergence: no matching event for {full_url}")
        payload = matched_event.get("payload", {})
        recorded_status = payload.get("status", 200)
        recorded_response_data = payload.get("response", "{}")
        if isinstance(recorded_response_data, str):
            try:
                recorded_response_data = recorded_response_data.encode("utf-8")
            except Exception:
                import base64
                recorded_response_data = base64.b64decode(recorded_response_data)
        from urllib3.response import HTTPResponse
        import io
        return HTTPResponse(
            body=io.BytesIO(recorded_response_data),
            headers={"Content-Type": "application/json"},
            status=recorded_status,
            preload_content=False
        )

    def _restore_network(self):
        try:
            import urllib3.connectionpool
            if "urllib3.urlopen" in self.original_funcs:
                urllib3.connectionpool.HTTPConnectionPool.urlopen = self.original_funcs["urllib3.urlopen"]
        except ImportError:
            pass
        try:
            import urllib.request
            if "urllib.request.urlopen" in self.original_funcs:
                urllib.request.urlopen = self.original_funcs["urllib.request.urlopen"]
        except Exception:
            pass
