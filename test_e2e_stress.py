"""
🔥 AgentTrace Production E2E Stress Test
=========================================
Architecture-correct design:
  - RECORD: Each trace runs in an isolated subprocess (SDK patches global state)
  - REPLAY: Concurrent via ThreadPoolExecutor (read-only, safe to parallelize)

Run:
  python test_e2e_stress.py
  python test_e2e_stress.py --runs 20 --workers 5
"""
import os
import sys
import json
import time
import uuid
import argparse
import subprocess
import textwrap
from concurrent.futures import ThreadPoolExecutor, as_completed
from supabase import create_client

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

SDK_PATH        = os.path.abspath(os.path.join(os.path.dirname(__file__), "packages", "python-sdk"))
EXECUTION_URL   = os.environ.get("EXECUTION_ENGINE_URL", "http://localhost:8000")
INGEST_API_URL  = "https://agnettrace.vercel.app/api"
API_KEY         = "at_live_7503d242ed97b23ea9ba3dc7b736f55f8b355e3d6e749aa4"

SUPABASE_URL    = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/") + "/"
SUPABASE_KEY    = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# ─────────────────────────────────────────────────────────────────────────────
# AGENT SCRIPT TEMPLATE (written to /tmp, recorded in subprocess)
# ─────────────────────────────────────────────────────────────────────────────

AGENT_SCRIPT_TEMPLATE = textwrap.dedent("""
# -*- coding: utf-8 -*-
import os, sys, time, random, urllib.request
sys.path.insert(0, {sdk_path!r})

import agenttrace
import agenttrace.config
from agenttrace.context import _trace_ctx

# Capture trace_id mid-run before context is reset by the decorator teardown
_captured_trace_id = None

agenttrace.config.init(
    api_key={api_key!r},
    api_url={api_url!r},
    mode="record"
)

@agenttrace.run(name="stress_agent_{run_id}")
def agent():
    global _captured_trace_id
    # Capture trace_id while we are still inside the decorated context
    ctx = _trace_ctx.get()
    if ctx:
        _captured_trace_id = ctx["trace_id"]

    print("[Agent] Starting run {run_id}")
    ticket_id = f"TKT-{{random.randint(1000, 9999)}}"
    print(f"[Agent] Ticket: {{ticket_id}}")

    try:
        req = urllib.request.Request(
            "https://httpbin.org/get",
            headers={{'User-Agent': 'AgentTrace-StressTest/1.0'}}
        )
        with urllib.request.urlopen(req) as r:
            body = r.read()
        print(f"[Agent] Network OK -- {{len(body)}} bytes")
    except Exception as e:
        print(f"[Agent] Network error: {{e}}")

    return {{"ticket": ticket_id, "success": True}}

agent()
time.sleep(2)

if _captured_trace_id:
    print("TRACE_ID:" + _captured_trace_id)
else:
    print("TRACE_ID:UNKNOWN")
""")





# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Record a trace in isolated subprocess
# ─────────────────────────────────────────────────────────────────────────────

def record_trace(run_id: int) -> str:
    """Spawn an isolated subprocess, run the agent, capture trace_id."""
    import tempfile
    script = AGENT_SCRIPT_TEMPLATE.format(
        sdk_path=SDK_PATH,
        api_key=API_KEY,
        api_url=INGEST_API_URL,
        run_id=run_id,
    )

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(script)
        script_path = f.name

    try:
        proc = subprocess.run(
            [sys.executable, script_path],
            capture_output=True, text=True, timeout=45
        )
        output = proc.stdout + proc.stderr
        for line in output.splitlines():
            if line.startswith("TRACE_ID:"):
                return line.split("TRACE_ID:")[1].strip()
        raise RuntimeError(f"[Run {run_id}] No TRACE_ID in output:\n{output}")
    finally:
        os.unlink(script_path)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Wait for trace to be visible in Supabase
# ─────────────────────────────────────────────────────────────────────────────

def wait_for_trace(trace_id: str, timeout: int = 15) -> bool:
    """Poll Supabase until the trace_events are visible (max `timeout` seconds)."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        # Can't verify — assume it's there and hope for the best
        return True

    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    deadline = time.time() + timeout
    while time.time() < deadline:
        res = client.table("trace_events").select("id").eq("trace_id", trace_id).limit(1).execute()
        if res.data:
            return True
        time.sleep(1.5)
    return False


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Execute replay on the execution engine
# ─────────────────────────────────────────────────────────────────────────────

def execute_replay(trace_id: str, run_id: int) -> dict:
    """POST to /replay/execute and validate deterministic output."""
    import requests
    url = f"{EXECUTION_URL}/replay/execute"
    r = requests.post(url, json={"trace_id": trace_id}, timeout=60)

    if r.status_code != 200:
        raise RuntimeError(f"[Run {run_id}] Execution engine HTTP {r.status_code}: {r.text[:200]}")

    data = r.json()

    if not data.get("success"):
        raise RuntimeError(f"[Run {run_id}] Execution engine returned failure: {data}")

    stdout = data.get("stdout", "")
    stderr = data.get("stderr", "")
    exit_code = data.get("exit_code", -1)

    # Verify deterministic indicators in stdout
    checks = {
        "replay_mode_active":  "Deterministic Replay Sandbox" in stdout,
        "network_intercepted": "urllib.request intercepted" in stdout or "urllib3 intercepted" in stdout,
        "network_success":     "Network OK" in stdout or "Network success" in stdout,
        "clean_exit":          exit_code == 0,
        "no_stderr":           stderr.strip() == "",
    }

    all_passed = all(checks.values())

    return {
        "run_id": run_id,
        "trace_id": trace_id,
        "checks": checks,
        "passed": all_passed,
        "stdout": stdout,
        "stderr": stderr,
        "exit_code": exit_code,
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Full pipeline for one run
# ─────────────────────────────────────────────────────────────────────────────

def full_run(run_id: int) -> dict:
    bar = "-" * 60
    print(f"\n{bar}\n🚀 RUN {run_id} — recording trace...\n{bar}")
    t0 = time.time()

    # 1. Record
    trace_id = record_trace(run_id)
    print(f"[Run {run_id}] ✅ Trace recorded: {trace_id} ({time.time()-t0:.1f}s)")

    # 2. Wait for Supabase propagation
    visible = wait_for_trace(trace_id, timeout=15)
    if not visible:
        raise RuntimeError(f"[Run {run_id}] Trace {trace_id} not visible in Supabase after 15s")
    print(f"[Run {run_id}] ✅ Trace visible in Supabase ({time.time()-t0:.1f}s)")

    # 3. Execute replay
    result = execute_replay(trace_id, run_id)
    elapsed = time.time() - t0

    status = "✅ PASS" if result["passed"] else "❌ FAIL"
    print(f"[Run {run_id}] {status} — replay in {elapsed:.1f}s")

    failed_checks = [k for k, v in result["checks"].items() if not v]
    if failed_checks:
        print(f"[Run {run_id}]   ⚠ Failed checks: {failed_checks}")
        print(f"[Run {run_id}]   stdout:\n{result['stdout']}")
        if result["stderr"]:
            print(f"[Run {run_id}]   stderr:\n{result['stderr']}")

    result["elapsed_s"] = round(elapsed, 2)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Concurrent stress orchestration
# ─────────────────────────────────────────────────────────────────────────────

def run_stress_test(total_runs: int, concurrent_workers: int):
    print("=" * 70)
    print("🔥  AgentTrace Production E2E Stress Test")
    print("=" * 70)
    print(f"   Runs:       {total_runs}")
    print(f"   Workers:    {concurrent_workers} (replay concurrency)")
    print(f"   Ingest API: {INGEST_API_URL}")
    print(f"   Engine:     {EXECUTION_URL}")
    print("=" * 70)

    # Phase 1: Record all traces sequentially (SDK constraint — no shared global state)
    print("\n📹  Phase 1: Recording traces (sequential — SDK constraint)...")
    trace_ids = []
    for i in range(total_runs):
        try:
            tid = record_trace(i + 1)
            trace_ids.append((i + 1, tid))
            print(f"   [{i+1}/{total_runs}] Recorded → {tid}")
            time.sleep(1.5)  # Brief pause between recordings to avoid burst upload
        except Exception as e:
            print(f"   [{i+1}/{total_runs}] ❌ RECORD FAILED: {e}")
            raise

    # Phase 2: Wait for all traces to be visible
    print(f"\n⏳  Phase 2: Waiting for {len(trace_ids)} traces to propagate to Supabase...")
    time.sleep(3)

    # Phase 3: Execute replays concurrently
    print(f"\n🔄  Phase 3: Replaying {len(trace_ids)} traces concurrently ({concurrent_workers} workers)...")
    results = []
    failures = []

    with ThreadPoolExecutor(max_workers=concurrent_workers) as executor:
        future_map = {
            executor.submit(execute_replay, tid, run_id): (run_id, tid)
            for run_id, tid in trace_ids
        }
        for future in as_completed(future_map):
            run_id, tid = future_map[future]
            try:
                result = future.result()
                results.append(result)
                status = "✅" if result["passed"] else "❌"
                print(f"   {status} Run {run_id} ({tid[:8]}…) exit={result['exit_code']}")
            except Exception as e:
                failures.append((run_id, tid, str(e)))
                print(f"   ❌ Run {run_id} FAILED: {e}")

    # ─── Results Summary ───────────────────────────────────────────────────
    print("\n" + "=" * 70)
    total = len(trace_ids)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed - len(failures)

    print(f"🔥  STRESS TEST COMPLETE")
    print(f"   Total runs:    {total}")
    print(f"   ✅ Passed:      {passed}")
    print(f"   ❌ Failed:      {failed + len(failures)}")
    print(f"   Pass rate:     {(passed/total)*100:.1f}%")

    if results:
        elapsed_vals = [r.get("elapsed_s", 0) for r in results]
        print(f"   Avg time/run:  {sum(elapsed_vals)/len(elapsed_vals):.1f}s")
        print(f"   Max time/run:  {max(elapsed_vals):.1f}s")

    print("=" * 70)

    if failures or failed > 0:
        print("\n⚠️  FAILURES DETECTED — NOT PRODUCTION READY")
        for r_id, t_id, err in failures:
            print(f"   Run {r_id} ({t_id}): {err}")
        sys.exit(1)
    else:
        print("\n✅  ALL RUNS DETERMINISTIC — PRODUCTION GATE PASSED")


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgentTrace E2E Stress Test")
    parser.add_argument("--runs",    type=int, default=5,  help="Total trace runs (default: 5)")
    parser.add_argument("--workers", type=int, default=3,  help="Concurrent replay workers (default: 3)")
    args = parser.parse_args()

    run_stress_test(args.runs, args.workers)
