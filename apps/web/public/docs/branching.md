# Branching & Multiverse View

AgentTrace allows you to "fork" a trace at any point in its history. This is useful for testing how an agent would have reacted if an external boundary (like an LLM response or a database query) had returned different data.

---

## What is a Branch?

A **Branch** is a child of an existing Trace. It inherits all events from the parent up to a specific **Fork Step**. From that moment on, the branch can have its own independent history.

When you create a branch, AgentTrace stores:
- **Parent Trace ID**: The original run.
- **Fork Step**: The sequential event index (`seq`) where the fork happens.
- **Overrides**: A set of key-value pairs that replace the data in the fork step's event payload.

---

## Creating a Branch (API)

Branches are usually created via the [Multiverse View](/dashboard/multiverse) in the dashboard, but can also be created via the REST API:

```bash
curl -X POST https://api.theagenttrace.com/branches/create \
  -H "Authorization: Bearer at_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "8821-441-aa6",
    "fork_step": 14,
    "name": "high-budget-scenario",
    "override": {
      "result": {"balance": 50000.0}
    }
  }'
```

The `override` field injects data directly into the `payload` of the event at `fork_step`.

---

## Executing a Branch

Once a branch is created, you can execute it in the AgentTrace Cloud Sandbox:

```bash
curl -X POST https://api.theagenttrace.com/replay/execute \
  -d '{"trace_id": "8821-441-aa6", "branch_id": "branch-551"}'
```

**What the Sandbox does:**
1. Loads the parent trace and isolates events `0` to `fork_step`.
2. Applies the `override` to event `fork_step`.
3. Downloads the agent's **Source Code** captured during the original parent run.
4. Installs the same **Pip Dependencies** used in the original run.
5. Replays the agent's logic up to `fork_step` deterministically.
6. Allows the agent to continue past `fork_step`, generating new events in the branch.

---

## The Multiverse View

In the AgentTrace Dashboard, the **Multiverse View** displays the parent trace and all its branches as a visual tree.

- **Primary Trace**: The original "canonical" execution from your production environment.
- **Branch**: A divergent path. Any step that differs from the parent is highlighted.
- **Diffing**: You can compare two branches side-by-side to see how a single change (e.g., a different system prompt) changed the agent's entire outcome.

---

## Why use Branching?

1. **Bug Reproduction**: If an agent failed because of a weird API response, fork the trace just before the failure, fix your code, and replay the branch to verify the fix.
2. **A/B Testing**: Branch a trace at the LLM call. In Branch A, use Prompt V1. In Branch B, use Prompt V2. Compare which path leads to the better outcome.
3. **Safety Analysis**: Fork an agent before it performs a destructive action (like sending an email) and override the safety-check to see if the agent appropriately refuses.
4. **Synthetic Data**: Generate hundreds of variations of a single successful run by slightly overriding the initial environment or user input at step 0.
