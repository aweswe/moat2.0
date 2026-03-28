# SDK Reference

The AgentTrace Python SDK is a thin, non-blocking collection layer. It follows a "capture-at-the-edge" philosophy, intercepting I/O at the library level (urllib3, httpx, socket) to ensure total visibility without manual logging.

---

## `init()`

Initializes the global configuration for AgentTrace.

```python
agenttrace.init(
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    mode: str = "record",
    replay_events: Optional[List[dict]] = None,
    governance_level: str = "relaxed"
)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `api_key` | `str` | `None` | Your project API key. If `None`, looks for `AGENTTRACE_API_KEY`. |
| `api_url` | `str` | `None` | Custom backend URL. |
| `mode` | `str` | `"record"` | `"record"` to capture, `"replay"` to simulate. |
| `replay_events`| `list` | `[]` | The event stream to use in `replay` mode. |
| `governance_level`| `str` | `"relaxed"`| `"relaxed"` (warns on leaks) or `"governance"` (errors on leaks). |

---

## `@run()` / `@trace` 

A decorator to wrap your agent's main entry point. It marks the lifecycle of a single **Trace**.

```python
@agenttrace.run(name: Optional[str] = None)
```

**Behavior:**
1. **Setup**: Installs I/O interceptors and initializes a new trace context.
2. **Metadata**: Auto-captures the current file's source code and `pip freeze` dependencies.
3. **Execution**: Runs the decorated function (sync or async).
4. **Teardown**: Captures final status/result, uninstalls interceptors, and ships the trace to the backend asynchronously.

**Example:**
```python
@agenttrace.run("customer-support-agent")
def start_chat(session_id: str):
    ...
```

---

## `step()`

A context manager to define logical boundaries within a trace.

```python
with agenttrace.step(name: str, type: str = "observation", **kwargs):
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `name` | `str` | **Required** | A short, descriptive name for the step (e.g., `"search-db"`). |
| `type` | `str` | `"observation"`| The classification of the step. Common values: `"tool_call"`, `"thought"`, `"observation"`. |
| `**kwargs` | `any` | — | Any extra key-value pairs to include in the event payload. |

**Usage:**
Steps automatically capture any I/O that happens inside their block and tag it with the step name. If an exception occurs, the step is automatically marked as `type: "error"`.

```python
with agenttrace.step("query-inventory", type="tool_call", sku="A123"):
    # Any network call here is tagged as 'query-inventory'
    resp = requests.get(...)
```

---

## `set_result()`

Explicitly sets the output or result of the **currently active step**.

```python
agenttrace.set_result(result_data: Any)
```

**Example:**
```python
with agenttrace.step("validate-user"):
    is_valid = user.status == "active"
    agenttrace.set_result({"valid": is_valid})
```

---

## Error Handling

AgentTrace is designed to be **invisible and resilient**.

- **Network Failures**: If the trace-upload fails, the SDK prints a warning to stderr but **never** interrupts your agent's execution.
- **Interception Safety**: The `DeterministicInterceptor` uses a global lock and `contextvars` to ensure thread-safety during concurrent async executions.
- **Leak Detection**: In `replay` mode with `governance_level="governance"`, any unexpected I/O will raise:
    - `ReplayMismatchError`: The agent performed a network/socket call not found in the recording.
    - `DeterminismLeakError`: The agent attempted a non-intercepted operation (e.g., raw DNS or entropy requests).
