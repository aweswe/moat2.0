# AgentTrace Onboarding & System Design Guide

Welcome to the **AgentTrace** team! This document is designed to get you up to speed on what we're building, the underlying architecture, and the technologies we use.

## What is AgentTrace?

AgentTrace is the **"What-If Machine for AI Agents"**. 
When developing autonomous AI agents, debugging is incredibly hard because they are non-deterministic. They make network calls, generate random numbers, and request LLM completions that change every time. 

**Our solution:** 
1. We **record** everything the agent does locally.
2. We **replay** it exactly as it happened in a cloud sandbox (Deterministic Replay).
3. We allow developers to **fork** the execution at any step (e.g., changing the payload of an API response or manipulating a random seed) to see "*what if the agent saw this instead?*" without actually re-running real APIs.

## High-Level Architecture

The system is divided into three main components:

### 1. The Python SDK (`packages/python-sdk/`)
This is what the user installs into their agent code (`pip install agenttrace`). 
- **Interceptor Pattern:** It monkey-patches standard libraries (`urllib3`, `urllib.request`, `random`, `time`) to intercept and record side-effects.
- **Record Mode:** Captures inputs, outputs, and side-effects as "Events" and syncs them to our backend.
- **Replay Mode:** Intercepts outgoing calls and returns the *recorded* responses instead of hitting the real network, enforcing deterministic execution.

### 2. The Execution Engine (`apps/backend/`)
This is our cloud sandbox (built with **FastAPI** + **Render**).
- **Sandbox Environment:** To verify an agent's determinism or run a "Fork", we take the recorded source code and trace events, and execute them in an isolated subprocess.
- **Validation:** Produces a **SHA-256 fingerprint** of the output to cryptographically prove that the execution was deterministic.
- **Branching (The Multiverse):** If a user requests a fork, we inject an override at a specific `fork_step`. The execution engine uses the override, marks subsequent steps as `_branched: true`, and produces a new counterfactual timeline.

### 3. The Web Dashboard (`apps/web/`)
The frontend is a modern web application for visualizing traces.
- **Stack:** **Next.js 14**, **Tailwind CSS**, **Shadcn UI**.
- **Features:** 
  - Timeline view of all recorded events.
  - **Multiverse View:** A visual diff showing how an agent's logic diverged compared to its original execution after a fork.
  - One-click "Run in Sandbox" to trigger the Execution Engine.

### 4. Database & Auth (`Supabase`)
We use **Supabase** (PostgreSQL) as our source of truth.
- `traces`: Metadata about an agent run (status, user, source code).
- `trace_events`: The granular, sequential steps an agent took (HTTP requests, outputs, tool calls).
- `branches`: Stores overrides and "fork step" details for counterfactual executions.
- `replays`: Logs of sandbox executions, tracking the cryptographic hashes of deterministic runs.

## Core Workflows to Understand

1. **Hydration (Record -> Cloud)**
   - The user runs their script with `agenttrace` decorators.
   - Events are batched and POSTed to `/api/trace/events` on the Next.js server, which writes them to Supabase.

2. **Replay (Cloud Sandbox Execution)**
   - The Web Dashboard hits the FastAPI engine at `/replay/execute`.
   - The engine downloads the real source code and the events.
   - It runs the `sandbox_script.py` which sets the SDK to `mode="replay"`.
   - The SDK blocks actual network calls and feeds recorded data back.
   - The engine compares outputs and returns the fingerprint.

3. **Fork Execution**
   - User creates an override in the Web Dashboard.
   - A `Branch` is created in Supabase with `fork_step=N` and the injected payload.
   - The FastAPI engine runs the replay but replaces the payload at step `N`.
   - Because the SDK is deterministic, the agent diverges exactly according to the injected payload. 

## Recommended Next Steps for Interns
1. **Read `agenttrace/interceptor.py`**: Understand how we mock the network, time, and PRNG.
2. **Read `apps/backend/main.py`**: Look at `execute_replay()` to see how we spin up the execution boundary.
3. **Run `python test_fork_execution.py`**: This script perfectly demonstrates the end-to-end "What-If" capability.
