# Core Concepts

AgentTrace is built around three ideas: everything that happens inside an agent run is **recorded**, that recording can be **replayed deterministically**, and replays can be **forked** at any point to explore alternatives.

---

## Trace

A **Trace** is one complete execution of your agent — from the moment `@agenttrace.run` is entered to when it returns or throws.

Each trace has:

| Field | Type | Description |
|---|---|---|
| `trace_id` | `UUID` | Globally unique identifier |
| `metadata.title` | `string` | `"Run: {agent_name}"` by default |
| `metadata.status` | `"in_progress" \| "completed" \| "failed"` | Final status |
| `metadata.duration_s` | `float` | Wall-clock execution time |
| `events` | `Event[]` | Ordered list of everything that happened |
| `source_code` | `string` | The full source file captured at decoration time |
| `requirements` | `string` | pip freeze output at record time |

Traces are uploaded to the backend at the end of the function via `POST /api/trace/register`.

---

## Event

An **Event** is the atomic unit of a trace — one thing that happened at one moment in time.

Every event has this shape:

```json
{
  "seq": 3,
  "type": "network_call",
  "timestamp": "2024-03-14T09:21:09.000Z",
  "timestamp_epoch": 1710411669.3,
  "step": "issue-refund",
  "payload": {
    "method": "POST",
    "url": "https://api.payments.example.com/refunds",
    "status": 200,
    "response": "{\"success\":true,\"txn_id\":\"TXN-441\"}"
  }
}
```

| Field | Description |
|---|---|
| `seq` | Zero-indexed sequential position within the trace |
| `type` | See event types below |
| `timestamp` | ISO 8601 UTC string |
| `timestamp_epoch` | Unix epoch float (used for time replay) |
| `step` | The `agenttrace.step()` name active when this event fired, or `"root"` |
| `payload` | Event-specific data |

### Event Types

| Type | Triggered By |
|---|---|
| `agent_start` | Entry into `@agenttrace.run` decorated function |
| `network_call` | Any `requests`, `httpx`, or `urllib3` HTTP request |
| `socket_call` | Raw TCP connect/send/recv (gRPC, websockets, etc.) |
| `observation` | `agenttrace.step(..., type="observation")` |
| `tool_call` | `agenttrace.step(..., type="tool_call")` |
| `error` | Unhandled exception inside the agent |
| `agent_complete` | Return from `@agenttrace.run` decorated function |

---

## Step

A **Step** is a named scope you define using `agenttrace.step()`. Steps don't create new events — they label the events that occur inside them.

```python
with agenttrace.step("check-eligibility", type="observation", user_id=user_id):
    eligible = amount <= balance
    agenttrace.set_result({"eligible": eligible, "balance": balance})
```

When any network call or tool call fires inside this context manager, it gets `"step": "check-eligibility"` in its event record. This is how AgentTrace tracks which part of your code caused which I/O.

Steps:
- Can be nested
- Work in both sync and async code (`async with agenttrace.step(...)`)
- Capture exceptions (the step's event type becomes `"error"` if the block raises)

---

## Record Mode

In **record mode** (the default), AgentTrace monkey-patches the Python runtime boundaries:

| Boundary | What's captured |
|---|---|
| `urllib3` HTTP | Method, URL, response body, status code |
| `httpx` (sync + async) | Same as urllib3 |
| `socket.connect/send/recv` | Raw bytes, remote address |
| `time.time` and `datetime.now` | Captured via the `agent_start` event timestamp |
| `random`, `uuid.uuid4` | The seed used is captured in `agent_start.payload.seed` |

These patches are installed when `@agenttrace.run` is entered and removed when the function returns. They do not affect code outside the decorated scope.

---

## Replay Mode

In **replay mode**, the same patches run in reverse — instead of capturing I/O, the interceptor **serves recorded responses back from the event pool**.

When you replay, the interceptor guarantees:

- `time.time()` returns the same epoch as the original run (frozen from `agent_start.timestamp_epoch`)
- `random.random()`, `uuid.uuid4()` produce the same sequence (seed restored from `agent_start.payload.seed`)
- Every HTTP call to the same URL returns the exact same response body from the recorded trace
- Every raw socket connection to the same address returns the same bytes

This means the agent makes the same decisions, in the same order, with the same data — on any machine, without network access.

### Enabling replay mode

```python
import agenttrace

# Load events from a previously recorded trace
events = [...]  # fetch from your dashboard or API

agenttrace.init(
    api_key="at_live_xxx",
    mode="replay",
    replay_events=events
)

@agenttrace.run("refund-processor")
def process_refund(order_id: str, amount: float):
    # This runs in the sandbox — all I/O served from `events`
    ...

process_refund("ORD-9021", 340.00)
```

Or from a file:

```bash
AGENTTRACE_MODE=replay \
AGENTTRACE_REPLAY_EVENTS_FILE=./trace-8821.json \
python agent.py
```

---

## Governance Levels

AgentTrace enforces a **governance level** that controls what happens when the agent tries to do something the sandbox hasn't recorded.

| Level | Behavior on unexpected I/O |
|---|---|
| `"relaxed"` (default) | Prints a warning, allows the call through |
| `"governance"` | Raises `DeterminismLeakError` or `ReplayMismatchError`, halts execution |

Use `"governance"` in CI pipelines where you need hard guarantees. Use `"relaxed"` when iterating locally.

```python
agenttrace.init(
    api_key="at_live_xxx",
    mode="replay",
    replay_events=events,
    governance_level="governance"   # strict mode
)
```

Environment variable:

```bash
AGENTTRACE_GOVERNANCE_LEVEL=governance python agent.py
```

### What governance catches

- Network calls to URLs not present in the recorded trace (`ReplayMismatchError`)
- DNS lookups (`DeterminismLeakError: DNS leak`)
- `os.urandom()` calls (`DeterminismLeakError: Raw entropy leak`)
- `subprocess.Popen()` calls
- `open()` and `os.listdir()` filesystem access
- `threading.Thread().start()` (prints a warning in both levels)

---

## Causal Fingerprint

After a replay completes, AgentTrace computes a **causal fingerprint** — a SHA-256 hash of all events, stripping non-deterministic fields (`timestamp`, `timestamp_epoch`, `env`, `argv`).

```
[AgentTrace] Replay consumed 14 events from trace. Fingerprint: a3f92c1d8e74b50f
```

If the fingerprint matches the original trace's fingerprint, the replay is **causally identical** — the agent made the same decisions in the same order. A mismatch means something changed (a prompt, a dependency, a code path).

This fingerprint is how AgentTrace detects regressions in CI without running in production.

---

## Branching

A **Branch** is a fork of a trace at a specific step, with optional payload overrides. Branches let you answer questions like:

- "What would have happened if the LLM had returned a different tool call at step 5?"
- "What if the balance check returned $0 instead of $1240?"
- "Does my retry logic work correctly when the API returns a 429 at step 3?"

Branches are created via the API or the Dashboard's Multiverse View. See [Branching](/docs/branching) for the full guide.

---

## Thread Safety

AgentTrace uses Python `contextvars.ContextVar` for all internal state. This means:

- Multiple async tasks running concurrently inside a single `@agenttrace.run` are fully isolated
- Each `asyncio.Task` gets its own trace context
- Events are written with a `threading.Lock` to prevent concurrent append races

In replay mode, multi-threading is detected and warned about because un-intercepted threads can make network calls that bypass the sandbox. In `governance` level, all `threading.Thread().start()` calls raise a warning.
