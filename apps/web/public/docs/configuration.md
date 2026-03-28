# Configuration

AgentTrace can be configured via `agenttrace.init()`, environment variables, or a configuration file.

---

## Configuration Priority

If multiple values are set for the same parameter, AgentTrace uses the following order of precedence:
1. **Argument passed to `init()`** (Highest Priority)
2. **Environment Variable**
3. **Default Value** (Lowest Priority)

---

## Parameters

| Key | init() Name | Environment Variable | Default |
|---|---|---|---|
| **API Key** | `api_key` | `AGENTTRACE_API_KEY` | — |
| **Backend URL** | `api_url` | `AGENTTRACE_API_URL` | `api.theagenttrace.com` |
| **Mode** | `mode` | `AGENTTRACE_MODE` | `"record"` |
| **Governance** | `governance_level`| `AGENTTRACE_GOVERNANCE_LEVEL`| `"relaxed"` |
| **Events File** | — | `AGENTTRACE_REPLAY_EVENTS_FILE`| — |

---

## API Key

Your API key identifies your project and organization. It must begin with `at_live_` or `at_test_`.

```python
agenttrace.init(api_key="at_live_...")
```

---

## Modes

### `record`
The default mode. Captures I/O and uploads traces to the AgentTrace backend. Use this in development, staging, and production.

### `replay`
Used for deterministic simulation. Does **not** perform real I/O. Instead, it serves responses from a provided event list.

```python
agenttrace.init(
    mode="replay",
    replay_events=[...] # list of events from a previous trace
)
```

**Alternative: Replay from File**
You can also point to a JSON file containing a trace:
```bash
export AGENTTRACE_MODE="replay"
export AGENTTRACE_REPLAY_EVENTS_FILE="./last-failure.json"
python my_agent.py
```

---

## Governance Levels

Governance levels control the strictness of the sandbox in `replay` mode.

### `relaxed` (Default)
Useful for local debugging. If the agent makes an unrecorded call (e.g., to a new URL), the SDK prints a `WARNING` but allows the call to pass through to the real internet.

### `governance`
Designed for CI/CD and security audits. If the agent diverges from the recording or attempts to "leak" out of the sandbox (e.g., raw DNS or entropy requests), the SDK raises an exception and halts execution.

---

## Log Filtering

To prevent sensitive data (passwords, PII) from being recorded in traces, you can use the `filter` argument in `agenttrace.step`.

*(Coming soon: Global sensitive data masking via configuration).*
