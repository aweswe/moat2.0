# Getting Started

AgentTrace records every decision, tool call, and network call your AI agent makes — so you can debug failures, replay executions deterministically, and branch from any point in history.

This guide gets you to a working trace in under 5 minutes.

---

## Prerequisites

- Python 3.9+
- An AgentTrace account and API key (get one at [theagenttrace.com](https://www.theagenttrace.com))

---

## 1. Install the SDK

```bash
pip install agenttrace
```

The SDK has no mandatory dependencies beyond the standard library. `requests` is used for trace upload and is included automatically.

---

## 2. Set your API key

```bash
export AGENTTRACE_API_KEY="at_live_xxxxxxxxxxxxxxxx"
```

Or pass it directly in code (useful for notebooks and scripts):

```python
import agenttrace
agenttrace.init(api_key="at_live_xxxxxxxxxxxxxxxx")
```

> If both are set, the argument takes priority over the environment variable.

---

## 3. Instrument your agent

The minimum required instrumentation is one decorator on your agent's entry point:

```python
import agenttrace

@agenttrace.run("refund-processor")
def process_refund(order_id: str, amount: float):
    # Your agent logic here
    ...
```

`@agenttrace.run` wraps the function, creates a new Trace for each invocation, and uploads all captured events when the function returns.

---

## 4. Add named steps

Use `agenttrace.step()` to group related logic into named, queryable spans within the trace:

```python
import agenttrace
import requests

@agenttrace.run("refund-processor")
def process_refund(order_id: str, amount: float):

    with agenttrace.step("fetch-order", type="tool_call", input={"order_id": order_id}):
        resp = requests.get(f"https://api.payments.example.com/orders/{order_id}")
        order = resp.json()
        agenttrace.set_result({"status": order["status"], "amount": order["total"]})

    with agenttrace.step("validate-eligibility", type="observation"):
        eligible = order["status"] == "delivered" and amount <= order["total"]
        agenttrace.set_result({"eligible": eligible})

    if not eligible:
        return {"refunded": False, "reason": "not_eligible"}

    with agenttrace.step("issue-refund", type="tool_call", input={"amount": amount}):
        resp = requests.post(
            "https://api.payments.example.com/refunds",
            json={"order_id": order_id, "amount": amount}
        )
        result = resp.json()
        agenttrace.set_result(result)

    return result


if __name__ == "__main__":
    agenttrace.init(api_key="at_live_xxxxxxxxxxxxxxxx")
    process_refund("ORD-9021", 340.00)
```

Running this produces a trace with 3 named steps. You can see the exact sequence of tool calls, their inputs, outputs, and timing in the AgentTrace dashboard.

---

## 5. Run it

```bash
python agent.py
```

You'll see in the console:

```
[AgentTrace] Initializing Network Capture (Record Mode).
[AgentTrace] Tearing down Deterministic Sandbox/Recorder.
```

Open the [AgentTrace Dashboard](https://www.theagenttrace.com/dashboard/traces) — your trace will appear within a few seconds.

---

## 6. What was captured

Each trace contains the following event types automatically:

| Event Type | When It's Created |
|---|---|
| `agent_start` | When your decorated function is called |
| `network_call` | Every `requests`, `httpx`, or `urllib3` call inside the agent |
| `socket_call` | Low-level TCP connect/send/recv (covers gRPC, raw sockets) |
| `error` | If the agent raises an uncaught exception |
| `agent_complete` | When your decorated function returns |

Your `agenttrace.step()` blocks appear as named spans wrapping these events.

---

## Using with async agents

The `@agenttrace.run` decorator works on both sync and async functions:

```python
import asyncio
import agenttrace
import httpx

@agenttrace.run("async-research-agent")
async def research(query: str):
    async with httpx.AsyncClient() as client:
        with agenttrace.step("web-search", type="tool_call", input={"query": query}):
            resp = await client.get(f"https://api.search.example.com/search?q={query}")
            results = resp.json()
            agenttrace.set_result({"count": len(results["hits"])})
    return results


asyncio.run(research("deterministic AI agent replay"))
```

AgentTrace captures all `httpx.AsyncClient` calls including async responses.

---

## Using with LangChain

```python
import agenttrace
from langchain_openai import ChatOpenAI
from langchain.agents import tool, AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate

agenttrace.init(api_key="at_live_xxxxxxxxxxxxxxxx")

@tool
def check_balance(user_id: str) -> dict:
    """Check the current balance for a user."""
    # Real implementation here
    return {"user_id": user_id, "balance": 1240.00, "currency": "USD"}

@tool
def issue_refund(user_id: str, amount: float) -> dict:
    """Issue a refund to a user."""
    # Real implementation here
    return {"success": True, "txn_id": "TXN-441", "amount": amount}


@agenttrace.run("langchain-billing-agent")
def run_billing_agent(task: str):
    llm = ChatOpenAI(model="gpt-4o")
    tools = [check_balance, issue_refund]
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a billing agent. Help users with refunds and balance inquiries."),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    agent = create_openai_functions_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools)
    return executor.invoke({"input": task})


result = run_billing_agent("Issue a refund of $340 to user U-9021")
```

All OpenAI API calls are automatically captured via the `httpx` interceptor. You'll see the exact prompt sent, the model's tool selection at each step, and every tool call with its arguments and return values.

---

## Next steps

- [Core Concepts](/docs/concepts) — Understand traces, events, steps, and replay
- [SDK Reference](/docs/sdk-reference) — Full API documentation
- [Deterministic Replay](/docs/replay) — How to replay and debug a recorded trace
