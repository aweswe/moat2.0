# Deterministic Replay

One of the most powerful features of AgentTrace is its ability to take a recorded execution and re-run it in a **closed-world sandbox**.

In Replay mode, your agent doesn't actually hit the internet or wait for time to pass. It believes it is running for the first time, but every external boundary is "faked" using the data from the original recording.

---

## How it works: The Interceptor

When you set `mode="replay"`, AgentTrace installs the `DeterministicInterceptor`. This object monkey-patches various parts of the Python standard library to redirect I/O to your recorded event stream.

### 1. Time Freezing
AgentTrace patches `time.time()`, `datetime.datetime.now()`, and `datetime.datetime.utcnow()`.
- **Behavior**: Instead of the current system clock, these functions return the **exact epoch** from the first event (`agent_start`) of your recording.
- **Why**: Many agents (and libraries) use timestamps to calculate timeouts or state. Frozen time prevents logic from diverging due to network lag in the simulation.

### 2. Randomness Locking
AgentTrace patches `random.seed()`, `random.random()`, and `uuid.uuid4()`.
- **Behavior**: The SDK restores the seed captured during the recording. `uuid.uuid4()` is modified to derive its values from the deterministic PRNG.
- **Why**: Ensures that "random" decisions, unique IDs, and hash-salts are identical across runs.

### 3. I/O Virtualization (HTTP/Network)
AgentTrace patches `urllib3` (used by `requests`) and `httpx` (used by OpenAI/Anthropic/LangChain).
- **Behavior**: When your agent calls `client.get("https://api.openai.com/v1/...")`, the interceptor intercepts the call and searches the recorded events for a match.
- **Matching Logic**: It looks for an event with the same **Method**, **URL**, and **Step Name**. If found, it returns the recorded response body and status code immediately.

### 4. Raw Socket Interception
For protocols that don't use high-level HTTP (gRPC, Redis, raw DB connections), AgentTrace patches the `socket.socket` class.
- **Behavior**: It records/replays raw bytes sent and received (`connect`, `send`, `recv`).

### 5. Filesystem & Entropy (Governance)
AgentTrace patches `builtins.open`, `os.listdir`, and `os.urandom`.
- **Behavior**: These are considered "leaks" from the deterministic world. Depending on your governance level, these will either print a warning or raise an exception to prevent your agent from being influenced by local machine state.

---

## Governance Levels

Governance levels determine how the sandbox reacts when the agent attempts an operation that wasn't recorded or is inherently non-deterministic.

```python
agenttrace.init(governance_level="governance")
```

| Threat | Relaxed (Default) | Governance (CI/Audit) |
|---|---|---|
| **Unknown Network Call** | Warning + Fallback | `ReplayMismatchError` |
| **DNS Lookup** | Warning | `DeterminismLeakError` |
| **Read/Write File** | Warning | `DeterminismLeakError` |
| **Entropy (secrets/urandom)** | Warning | `DeterminismLeakError` |

---

## Verifying Determinism

After a replay finishes, AgentTrace produces a **Causal Fingerprint**.

This is a SHA-256 hash of the entire sequence of events, excluding volatile fields like wall-clock timestamps or environment-specific paths.

- **Match**: If the fingerprint of the replay matches the original recording, you have **mathematically proven** that the agent followed the same decision logic.
- **Mismatch**: If the fingerprints differ, the agent diverged. This usually happens because the code was changed, or a prompt was modified.

This fingerprinting is the foundation of **Continuous Replay (CR)** — just like CI, but for agent behavior.
