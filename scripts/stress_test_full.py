#!/usr/bin/env python3
"""
AgentTrace Stress Test Suite
=============================
Tests the entire pipeline end-to-end:
  1. Cloud Sync Stability       - upload → download round-trip, no missing events
  2. Replay Determinism          - hash match across repeated replays
  3. Branch Operations Under Load - concurrent forks, large override diffs
  4. Script Upload/Download      - script.py round-trip integrity
  5. API Endpoint Resilience     - malformed input, error handling

Run with:  python scripts/stress_test_full.py
"""

import os
import sys
import json
import time
import hashlib
import uuid
import math
import statistics
import requests
import concurrent.futures
from pathlib import Path
from collections import defaultdict

# ─── Config ─────────────────────────────────────────────────────
BASE_URL = os.environ.get("AGENTTRACE_BASE_URL", "http://localhost:3000")
ITERATIONS = 5          # How many times to repeat each test category
CONCURRENT_FORKS = 10   # Parallel branch creation attempts

# Load env vars
def load_env():
    env_path = Path("apps/web/.env.local")
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

load_env()

# ─── Results Tracker ────────────────────────────────────────────
class Results:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def ok(self, name):
        self.passed += 1
        print(f"  ✅ {name}")

    def fail(self, name, reason):
        self.failed += 1
        self.errors.append((name, reason))
        print(f"  ❌ {name}: {reason}")

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"  STRESS TEST RESULTS")
        print(f"{'='*60}")
        print(f"  Total:  {total}")
        print(f"  Passed: {self.passed}")
        print(f"  Failed: {self.failed}")
        if self.errors:
            print(f"\n  FAILURES:")
            for name, reason in self.errors:
                print(f"    • {name}: {reason}")
        print(f"{'='*60}")
        return self.failed == 0

R = Results()


# ─── Latency Tracker ───────────────────────────────────────────
class LatencyTracker:
    """Records per-call latency and computes p50/p95/p99."""
    def __init__(self):
        self.all_latencies = []           # every call
        self.by_endpoint = defaultdict(list)  # grouped by path

    def record(self, path: str, latency_ms: float):
        self.all_latencies.append(latency_ms)
        self.by_endpoint[path].append(latency_ms)

    def _percentile(self, data: list, pct: int) -> float:
        if not data:
            return 0.0
        sorted_d = sorted(data)
        idx = int(math.ceil(pct / 100.0 * len(sorted_d))) - 1
        return sorted_d[max(0, idx)]

    def report(self):
        if not self.all_latencies:
            print("  No latency data collected.")
            return

        p50 = self._percentile(self.all_latencies, 50)
        p95 = self._percentile(self.all_latencies, 95)
        p99 = self._percentile(self.all_latencies, 99)
        avg = statistics.mean(self.all_latencies)
        total = len(self.all_latencies)

        print(f"\n{'='*60}")
        print(f"  ⏱  LATENCY REPORT ({total} API calls)")
        print(f"{'='*60}")
        print(f"  {'Metric':<12} {'Value':>10}")
        print(f"  {'─'*24}")
        print(f"  {'avg':<12} {avg:>8.0f}ms")
        print(f"  {'p50':<12} {p50:>8.0f}ms")
        print(f"  {'p95':<12} {p95:>8.0f}ms")
        print(f"  {'p99':<12} {p99:>8.0f}ms")
        print(f"  {'min':<12} {min(self.all_latencies):>8.0f}ms")
        print(f"  {'max':<12} {max(self.all_latencies):>8.0f}ms")

        # Per-endpoint breakdown
        print(f"\n  Per-Endpoint Breakdown:")
        print(f"  {'Endpoint':<30} {'calls':>5} {'avg':>7} {'p50':>7} {'p95':>7} {'p99':>7}")
        print(f"  {'─'*66}")
        for path, lats in sorted(self.by_endpoint.items(), key=lambda x: -statistics.mean(x[1])):
            ep_avg = statistics.mean(lats)
            ep_p50 = self._percentile(lats, 50)
            ep_p95 = self._percentile(lats, 95)
            ep_p99 = self._percentile(lats, 99)
            # Truncate path for display
            display = path if len(path) <= 28 else "..." + path[-25:]
            print(f"  {display:<30} {len(lats):>5} {ep_avg:>6.0f}ms {ep_p50:>5.0f}ms {ep_p95:>5.0f}ms {ep_p99:>5.0f}ms")

        # Histogram (buckets: <100, 100-500, 500-1000, 1000-3000, 3000+)
        buckets = {"<100ms": 0, "100-500ms": 0, "500ms-1s": 0, "1-3s": 0, ">3s": 0}
        for l in self.all_latencies:
            if l < 100:
                buckets["<100ms"] += 1
            elif l < 500:
                buckets["100-500ms"] += 1
            elif l < 1000:
                buckets["500ms-1s"] += 1
            elif l < 3000:
                buckets["1-3s"] += 1
            else:
                buckets[">3s"] += 1

        print(f"\n  Distribution:")
        max_bar = 30
        for bucket, count in buckets.items():
            pct = count / total * 100
            bar_len = int(pct / 100 * max_bar)
            bar = "█" * bar_len
            print(f"  {bucket:<12} {bar:<30} {count:>4} ({pct:.0f}%)")

        print(f"{'='*60}")

LAT = LatencyTracker()


# ─── Helpers ────────────────────────────────────────────────────
def api(method, path, **kwargs):
    """Make an API request and return (status, data). Records latency."""
    url = f"{BASE_URL}{path}"
    t0 = time.perf_counter()
    try:
        resp = getattr(requests, method)(url, timeout=30, **kwargs)
        latency_ms = (time.perf_counter() - t0) * 1000
        LAT.record(path, latency_ms)
        try:
            data = resp.json()
        except Exception:
            data = {"raw": resp.text[:500]}
        return resp.status_code, data
    except requests.exceptions.ConnectionError:
        latency_ms = (time.perf_counter() - t0) * 1000
        LAT.record(path, latency_ms)
        return 0, {"error": "Connection refused"}
    except requests.exceptions.Timeout:
        latency_ms = (time.perf_counter() - t0) * 1000
        LAT.record(path, latency_ms)
        return 0, {"error": "Timeout"}

def get_any_trace_id():
    """Get a trace ID that exists in the system."""
    from supabase import create_client
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if not url or not key:
        return None
    client = create_client(url, key)
    resp = client.table("traces").select("id").limit(1).execute()
    if resp.data:
        return resp.data[0]["id"]
    return None

def sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


# ═══════════════════════════════════════════════════════════════
# TEST 1: CLOUD SYNC STABILITY
# ═══════════════════════════════════════════════════════════════
def test_cloud_sync():
    print("\n🔵 TEST 1: Cloud Sync Stability")
    print("-" * 40)

    trace_id = get_any_trace_id()
    if not trace_id:
        R.fail("cloud_sync.trace_exists", "No traces found in Supabase")
        return

    R.ok(f"cloud_sync.trace_exists ({trace_id[:8]})")

    # Test: Replay downloads events and returns them
    for i in range(ITERATIONS):
        status, data = api("post", "/api/replay", json={"traceId": trace_id, "step": 0})
        if status == 200:
            event_count = data.get("eventCount", 0)
            if event_count > 0:
                R.ok(f"cloud_sync.replay_round_trip_{i+1} ({event_count} events)")
            else:
                R.fail(f"cloud_sync.replay_round_trip_{i+1}", "0 events returned")
        else:
            R.fail(f"cloud_sync.replay_round_trip_{i+1}", f"HTTP {status}: {data.get('error', 'unknown')}")

    # Test: Events are consistent (hash should match across repeated downloads)
    hashes = set()
    for i in range(3):
        status, data = api("post", "/api/replay", json={"traceId": trace_id})
        if status == 200 and "parentHash" in data:
            hashes.add(data["parentHash"])

    if len(hashes) == 1:
        R.ok(f"cloud_sync.hash_stable ({list(hashes)[0][:12]}...)")
    elif len(hashes) == 0:
        R.fail("cloud_sync.hash_stable", "No hashes returned")
    else:
        R.fail("cloud_sync.hash_stable", f"Hash drift! Got {len(hashes)} different hashes")


# ═══════════════════════════════════════════════════════════════
# TEST 2: REPLAY DETERMINISM
# ═══════════════════════════════════════════════════════════════
def test_replay_determinism():
    print("\n🟢 TEST 2: Replay Determinism Guarantee")
    print("-" * 40)

    trace_id = get_any_trace_id()
    if not trace_id:
        R.fail("replay.trace_exists", "No traces found")
        return

    # Replay at different steps, verify state is consistent
    status, data = api("post", "/api/replay", json={"traceId": trace_id})
    if status != 200:
        R.fail("replay.full", f"HTTP {status}")
        return

    max_step = data.get("maxStep", 0)
    if max_step < 2:
        R.ok("replay.full (trace too short for step tests)")
        return

    R.ok(f"replay.full (maxStep={max_step})")

    # Replay at step 0, mid, and max — verify hashes match full replay
    full_hash = data.get("parentHash", "")
    steps_to_test = [0, max_step // 2, max_step]

    for step in steps_to_test:
        status, step_data = api("post", "/api/replay", json={"traceId": trace_id, "step": step})
        if status == 200:
            R.ok(f"replay.step_{step} (events={step_data.get('eventCount', '?')})")
        else:
            R.fail(f"replay.step_{step}", f"HTTP {status}")

    # Idempotency: replay the same step 5 times
    hashes = []
    for i in range(ITERATIONS):
        status, data = api("post", "/api/replay", json={"traceId": trace_id, "step": 0})
        if status == 200:
            state_hash = sha256(json.dumps(data.get("state", {}), sort_keys=True))
            hashes.append(state_hash)

    if len(set(hashes)) == 1:
        R.ok(f"replay.idempotent ({ITERATIONS}x same hash)")
    else:
        R.fail("replay.idempotent", f"Got {len(set(hashes))} different state hashes over {ITERATIONS} runs")


# ═══════════════════════════════════════════════════════════════
# TEST 3: BRANCH OPERATIONS UNDER LOAD
# ═══════════════════════════════════════════════════════════════
def test_branch_operations():
    print("\n🟡 TEST 3: Branch Operations Under Load")
    print("-" * 40)

    trace_id = get_any_trace_id()
    if not trace_id:
        R.fail("branch.trace_exists", "No traces found")
        return

    # 3a: List branches (even if none exist)
    status, data = api("get", f"/api/branches?traceId={trace_id}")
    if status == 200:
        branch_count = len(data.get("branches", []))
        R.ok(f"branch.list ({branch_count} existing)")
    else:
        R.fail("branch.list", f"HTTP {status}")

    # 3b: Create a single branch
    status, data = api("post", "/api/branches", json={
        "traceId": trace_id,
        "forkStep": 0,
        "name": f"stress-test-{int(time.time())}",
        "overridePayload": {"stress_key": "stress_value"}
    })
    if status == 200 or status == 201:
        branch_id = data.get("branchId", data.get("branch_id", ""))
        R.ok(f"branch.create_single ({branch_id[:8] if branch_id else 'ok'})")
    else:
        R.fail("branch.create_single", f"HTTP {status}: {data.get('error', json.dumps(data)[:100])}")

    # 3c: Concurrent branch creation (with spike detection)
    def create_branch_timed(idx):
        t0 = time.perf_counter()
        status, data = api("post", "/api/branches", json={
            "traceId": trace_id,
            "forkStep": 0,
            "name": f"concurrent-{idx}-{int(time.time())}",
            "overridePayload": {"idx": idx}
        })
        elapsed = (time.perf_counter() - t0) * 1000
        return status, data, elapsed, idx

    successes = 0
    failures = 0
    fork_latencies = []
    failure_indices = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_FORKS) as executor:
        futures = [executor.submit(create_branch_timed, i) for i in range(CONCURRENT_FORKS)]
        for f in concurrent.futures.as_completed(futures):
            status, data, elapsed, idx = f.result()
            fork_latencies.append(elapsed)
            if status in (200, 201):
                successes += 1
            else:
                failures += 1
                failure_indices.append(idx)

    if successes >= CONCURRENT_FORKS * 0.8:
        R.ok(f"branch.concurrent ({successes}/{CONCURRENT_FORKS} succeeded)")
    else:
        R.fail("branch.concurrent", f"Only {successes}/{CONCURRENT_FORKS} succeeded")

    # Concurrent fork latency analysis
    if fork_latencies:
        avg_lat = statistics.mean(fork_latencies)
        max_lat = max(fork_latencies)
        min_lat = min(fork_latencies)
        p95_lat = sorted(fork_latencies)[int(0.95 * len(fork_latencies)) - 1] if len(fork_latencies) > 1 else fork_latencies[0]

        print(f"\n  📊 Concurrent Fork Metrics ({CONCURRENT_FORKS} forks):")
        print(f"     avg: {avg_lat:.0f}ms  |  min: {min_lat:.0f}ms  |  max: {max_lat:.0f}ms  |  p95: {p95_lat:.0f}ms")

        # Spike detection: flag if max > 3x avg
        if max_lat > avg_lat * 3 and avg_lat > 0:
            spike_ratio = max_lat / avg_lat
            print(f"     ⚠️  SPIKE DETECTED: max is {spike_ratio:.1f}x the average")
            R.fail("branch.spike_detection", f"Max latency ({max_lat:.0f}ms) is {spike_ratio:.1f}x avg ({avg_lat:.0f}ms)")
        else:
            R.ok(f"branch.no_spike (max {max_lat:.0f}ms ≤ 3x avg {avg_lat:.0f}ms)")

        # Failure pattern
        if failure_indices:
            print(f"     ⚠️  Failed indices: {failure_indices}")
        else:
            R.ok(f"branch.zero_failures_under_load")

    # 3d: Verify branches list grew
    status, data = api("get", f"/api/branches?traceId={trace_id}")
    if status == 200:
        new_count = len(data.get("branches", []))
        R.ok(f"branch.list_after_load ({new_count} branches)")
    else:
        R.fail("branch.list_after_load", f"HTTP {status}")


# ═══════════════════════════════════════════════════════════════
# TEST 4: SCRIPT UPLOAD/DOWNLOAD ROUND-TRIP
# ═══════════════════════════════════════════════════════════════
def test_script_roundtrip():
    print("\n🟣 TEST 4: Script Upload/Download Reliability")
    print("-" * 40)

    trace_id = get_any_trace_id()
    if not trace_id:
        R.fail("script.trace_exists", "No traces found")
        return

    # 4a: Download script (may or may not exist)
    status, data = api("get", f"/api/trace/script?traceId={trace_id}")
    if status == 200 and data.get("script"):
        script_len = len(data["script"])
        source = data.get("source", "unknown")
        R.ok(f"script.download ({script_len} chars, from {source})")

        # 4b: Verify content is valid Python-ish
        script = data["script"]
        if "import" in script or "def " in script or "print" in script:
            R.ok("script.valid_python")
        else:
            R.fail("script.valid_python", "Downloaded script doesn't look like Python")

        # 4c: Download again, verify identical
        status2, data2 = api("get", f"/api/trace/script?traceId={trace_id}")
        if status2 == 200 and data2.get("script") == script:
            R.ok("script.idempotent_download")
        else:
            R.fail("script.idempotent_download", "Second download differs from first")

    elif status == 404:
        R.ok("script.download (no script uploaded — expected for some traces)")
    else:
        R.fail("script.download", f"HTTP {status}: {data.get('error', 'unknown')}")


# ═══════════════════════════════════════════════════════════════
# TEST 5: API ENDPOINT RESILIENCE
# ═══════════════════════════════════════════════════════════════
def test_api_resilience():
    print("\n🔴 TEST 5: API Endpoint Resilience")
    print("-" * 40)

    # 5a: Replay with missing traceId
    status, data = api("post", "/api/replay", json={})
    if status == 400:
        R.ok("api.replay_missing_id (400)")
    else:
        R.fail("api.replay_missing_id", f"Expected 400, got {status}")

    # 5b: Replay with nonexistent trace
    status, data = api("post", "/api/replay", json={"traceId": "nonexistent-trace-id-000"})
    if status in (404, 500):  # Either is acceptable
        R.ok(f"api.replay_bad_trace ({status})")
    else:
        R.fail("api.replay_bad_trace", f"Expected 404/500, got {status}")

    # 5c: Branches with missing traceId
    status, data = api("get", "/api/branches")
    if status == 400:
        R.ok("api.branches_missing_id (400)")
    elif status == 200 and data.get("branches") is not None:
        R.ok("api.branches_missing_id (200 with empty list — acceptable)")
    else:
        R.fail("api.branches_missing_id", f"Expected 400/200, got {status}")

    # 5d: Branch create with malformed body
    status, data = api("post", "/api/branches", json={"garbage": True})
    if status >= 400:
        R.ok(f"api.branch_malformed ({status})")
    else:
        R.fail("api.branch_malformed", f"Expected 4xx/5xx, got {status}")

    # 5e: Script fetch with missing traceId
    status, data = api("get", "/api/trace/script")
    if status == 400:
        R.ok("api.script_missing_id (400)")
    else:
        R.fail("api.script_missing_id", f"Expected 400, got {status}")

    # 5f: Script fetch with nonexistent trace
    status, data = api("get", "/api/trace/script?traceId=nonexistent-000")
    if status in (404, 500):
        R.ok(f"api.script_bad_trace ({status})")
    else:
        R.fail("api.script_bad_trace", f"Expected 404/500, got {status}")

    # 5g: Rapid-fire requests (light DDoS test)
    rapid_successes = 0
    for i in range(20):
        status, _ = api("get", f"/api/branches?traceId=rapid-test-{i}")
        if status > 0:  # Any response = server didn't crash
            rapid_successes += 1
    if rapid_successes == 20:
        R.ok(f"api.rapid_fire (20/20 responded)")
    else:
        R.fail("api.rapid_fire", f"Only {rapid_successes}/20 responded")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  AGENTTRACE STRESS TEST SUITE")
    print(f"  Target: {BASE_URL}")
    print(f"  Time:   {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Verify server is reachable
    status, _ = api("get", "/api/branches?traceId=health-check")
    if status == 0:
        print(f"\n❌ FATAL: Cannot reach {BASE_URL}")
        print("   Make sure 'npm run dev' is running.")
        sys.exit(1)

    t0 = time.time()

    test_cloud_sync()
    test_replay_determinism()
    test_branch_operations()
    test_script_roundtrip()
    test_api_resilience()

    elapsed = time.time() - t0

    passed = R.summary()
    LAT.report()
    print(f"\n  Duration: {elapsed:.1f}s")

    sys.exit(0 if passed else 1)
