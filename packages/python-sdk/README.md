# AgentTrace Python SDK

The deterministic execution and replay layer for AI Agents.

Stop guessing why your agents crash in production. AgentTrace records every LLM call, tool execution, and intermediate state—letting you rewind time, fork the execution, and test fixes instantly.

## Installation

```bash
pip install agenttrace-py
```

## Quick Start (The "Thin" SDK)

AgentTrace works as a thin data-collection layer. Simply decorate your main entry point, and use `with agenttrace.step()` to log intermediate actions. The SDK automatically bundles the events and syncs them securely to your dashboard.

```python
import agenttrace

# 1. Initialize with your API Key
agenttrace.init(api_key="at_live_...")

# 2. Add the @agenttrace.run decorator to track the entire execution
@agenttrace.run(name="checkout_agent")
def main():
    
    # 3. Log an LLM call or thought process
    with agenttrace.step("Planning Phase", type="thought"):
        plan = "Validating the order."
        
    # 4. Log a tool execution
    with agenttrace.step("Validate Order", type="tool_call", input={"order_id": 123}):
        # Your custom tool code here
        result = {"status": "valid"}
        agenttrace.set_result(result)
        
    return {"success": True}

if __name__ == "__main__":
    main()
```

When `main()` finishes, the complete trace is uploaded securely and becomes available in your AgentTrace dashboard for debugging and forking.
