# AgentTrace

**The Deterministic Observability & Governance Layer for AI Agents.**

AgentTrace is a high-fidelity observability platform designed to solve the "Black Box" problem of autonomous AI agents. Unlike traditional logging, AgentTrace captures the complete **causal state** of an agent execution, allowing developers to replay, branch, and govern agent behavior with mathematical certainty.

---

## 🚀 The Core Problem: Causal Drift

AI agents are inherently non-deterministic. Variations in LLM temperature, network latency, system clocks, and local disk state make debugging nearly impossible. A bug that appears once may never be seen again.

**AgentTrace fixes this by enforcing a Causal Lockdown.**

- **Input Isolation**: Every API response, file read, and system call is intercepted and recorded.
- **Clock Mocking**: Replays use the exact same virtual time as the original recording.
- **Entropy Control**: Random seeds are captured and re-injected to ensure identical logic paths.

---

## 🛠 Technical Architecture

AgentTrace is built as a three-tier system:

### 1. The Python SDK (`agenttrace`)
A lightweight, decorator-based library that implements a **Deterministic Interceptor**. 
- Built using Python's `inspect` and `functools` modules.
- Hooks into `urllib`, `requests`, and `open()` to record external side effects.
- Automatically captures source code and environment metadata for every run.

### 2. The Execution Engine (Sandbox)
A secure, isolated execution environment (running on Render) that performs the heavy lifting of replaying traces.
- **Governance Sandbox**: Uses `ulimit` and process isolation to prevent "leaks."
- **Fingerprint Verification**: Generates a SHA256 "Causal Fingerprint" by hashing randomized/temporal-scrubbed events to verify trace integrity.

### 3. The Multiverse UI
A Next.js 14 frontend that allows you to visualize and "Fork" reality.
- **Timeline Inspection**: Step-through every intent and action an agent took.
- **Branching**: Modify your agent's code, click "Fork," and see how the agent would have behaved differently from that exact moment in time.

---

## 🕹 Operational Modes

AgentTrace operates in three distinct modes to balance developer speed with production safety:

| Mode | Purpose | Determinism Level | Backend Action |
| :--- | :--- | :--- | :--- |
| **Record** | Live Execution | Captures Reality | Uploads Telemetry |
| **Relaxed Replay** | Rapid Debugging | Soft Match | Warnings on Drift |
| **Governance** | Production Audit | **Strict Lockdown** | Kill process on Drift/Leaks |

### Governance Level Enforcement
When `AGENTTRACE_GOVERNANCE_LEVEL` is set to `governance`:
1. **No External I/O**: Any attempt to call an API or read a file NOT in the original trace causes an immediate `SandboxViolation`.
2. **Zero Drift**: If the agent's internal logic deviates from the recorded sequence, the execution is terminated to prevent unauthorized actions.

---

## 💻 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI.
- **Backend API**: Next.js Serverless Functions.
- **Orchestration**: Render (Compute), Github Actions (CI/CD).
- **Execution**: Python 3.10+, FastAPI.
- **Database**: Supabase (PostgreSQL) + Auth + Real-time.
- **Storage**: Supabase Storage (Source code & Trace artifacts).

---

## 🎯 Use Cases

- **Agent Regression Testing**: Change a prompt and immediately see if the agent's logical path changed across 100 historical traces.
- **Interactive Debugging**: When an agent fails at Step 50, fork the trace at Step 49 and test a fix without re-running the first 49 steps.
- **Compliance & Auditing**: Provide a cryptographic guarantee that an agent followed specific safety protocols.
- **Human-in-the-loop**: Pause an agent, explore potential "futures" via branching, and then resume the safest path.

---

## ⚡ Quick Start

### 1. Install the SDK
```bash
pip install agenttrace  # Coming soon to PyPI
```

### 2. Initialize and Run
```python
import agenttrace

agenttrace.init(api_key="at_live_...")

@agenttrace.run(name="my_first_agent")
def main():
    # Your agent logic here
    pass

if __name__ == "__main__":
    main()
```

### 3. Access the Dashboard
View your deterministic traces at [theagenttrace.com](https://www.theagenttrace.com).

---

## 🛡 License
Commercial Property of AgentTrace. All Rights Reserved.
