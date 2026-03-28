# REST API Reference

The AgentTrace backend provides a standard REST API for registering traces, managing branches, and executing replays in the cloud.

---

## Base URL

```bash
https://api.theagenttrace.com/api
```

---

## Authentication

All requests (except health checks) require your API key in the `Authorization` header.

```bash
Authorization: Bearer <YOUR_API_KEY>
```

---

## Traces

### Register a Trace
The Python SDK calls this automatically at the end of a decorated function.

`POST /trace/register`

**Request Body:**
```json
{
  "trace_id": "uuid-string",
  "metadata": {
    "title": "Refund Run",
    "status": "completed",
    "event_count": 42
  },
  "events": [...],
  "source_code": "print('hello')",
  "requirements": "langchain==0.1.0"
}
```

---

## Branches

### Create a Branch
Fork a trace at a specific step with optional overrides.

`POST /branches/create`

**Request Body:**
```json
{
  "trace_id": "parent-trace-uuid",
  "fork_step": 12,
  "name": "my-hypothesis",
  "override": {
    "result": {"status": "error", "code": 429}
  }
}
```

---

## Execution Engine

### Execute Replay
Runs a trace or branch in the AgentTrace Cloud Sandbox.

`POST /replay/execute`

**Request Body:**
```json
{
  "trace_id": "trace-uuid",
  "branch_id": "optional-branch-uuid",
  "governance_level": "relaxed | governance"
}
```

**Response:**
Returns the full event stream of the resulting execution, plus the **Causal Fingerprint**.

---

## Utilities

### Health Check
`GET /health`

**Response:**
```json
{"status": "ok", "service": "agenttrace-execution-engine"}
```
