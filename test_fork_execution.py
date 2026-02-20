# -*- coding: utf-8 -*-
"""
test_fork_execution.py
======================
Tests the full fork/branch pipeline:

  1. Takes an existing trace
  2. Creates a branch at step 0 (agent_start) with an overridden seed value
  3. Executes the ORIGINAL trace via /replay/execute  -> baseline fingerprint
  4. Executes the BRANCH       via /replay/execute with branch_id  -> branch fingerprint
  5. Compares the two fingerprints to confirm the branch diverged deterministically

Run:
    python test_fork_execution.py <trace_id>
    python test_fork_execution.py  # uses the most recent trace automatically
"""
import sys
import json
import requests
from supabase import create_client

ENGINE_URL    = "http://localhost:8000"
SUPABASE_URL  = "https://wddxzszcjturywfzjxjy.supabase.co/"
SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZHh6c3pjanR1cnl3ZnpqeGp5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc0MzQ5MCwiZXhwIjoyMDc5MzE5NDkwfQ.Jqic9fji_5WXXvkf0OZ3gGA-ET9zAUuupha6bjK-59s"


def get_latest_trace_id():
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    r = client.table("traces").select("id,title,created_at").order("created_at", desc=True).limit(1).execute()
    if not r.data:
        raise RuntimeError("No traces found in Supabase")
    trace = r.data[0]
    print(f"[Auto] Using latest trace: {trace['id']} — {trace.get('title')}")
    return trace["id"]


def step(label, n, total=5):
    bar = "=" * 60
    print(f"\n{bar}\n[{n}/{total}] {label}\n{bar}")


def run_fork_test(trace_id: str):
    print("\n" + "=" * 60)
    print("🔱  AgentTrace Fork Execution Test")
    print("=" * 60)
    print(f"Trace ID: {trace_id}")
    print(f"Engine:   {ENGINE_URL}")

    # ── 1. Health check ───────────────────────────────────────────
    step("Health check", 1)
    r = requests.get(f"{ENGINE_URL}/health")
    assert r.status_code == 200, f"Engine not healthy: {r.text}"
    print("Engine status:", r.json())

    # ── 2. Baseline replay ────────────────────────────────────────
    step("Baseline replay (original trace)", 2)
    r = requests.post(f"{ENGINE_URL}/replay/execute", json={"trace_id": trace_id})
    assert r.status_code == 200, f"Baseline replay failed: {r.status_code} {r.text}"
    baseline = r.json()
    print("Events consumed  :", baseline.get("events_consumed"))
    print("Baseline fingerprint:", baseline.get("replay_fingerprint"))
    for line in baseline.get("stdout", "").split("\n"):
        if line.strip() and "[AgentTrace]" in line:
            print("  ", line)

    # ── 3. Create branch at step 0 with overridden seed ───────────
    step("Creating branch at fork_step=0 (override seed)", 3)
    fork_payload = {
        "trace_id": trace_id,
        "fork_step": 0,
        "name": "fork-test-seed-override",
        "override": {
            # inject a different PRNG seed — this changes derived random values
            "seed": 999999,
            "_fork_reason": "stress test override"
        }
    }
    r = requests.post(f"{ENGINE_URL}/branches/create", json=fork_payload)
    assert r.status_code == 200, f"Branch creation failed: {r.status_code} {r.text}"
    branch_result = r.json()
    branch_id = branch_result["branchId"]
    print("Branch ID   :", branch_id)
    print("Fork step   :", branch_result["forkStep"])
    print("Parent hash :", branch_result["parentHash"][:16], "...")

    # ── 4. List branches to confirm persistence ───────────────────
    step("Listing branches for trace", 4)
    r = requests.get(f"{ENGINE_URL}/branches/list", params={"trace_id": trace_id})
    assert r.status_code == 200, f"Branch list failed: {r.status_code} {r.text}"
    branches = r.json().get("branches", [])
    print(f"Found {len(branches)} branch(es):")
    for b in branches:
        print(f"  - {b['id'][:8]}... | step={b['forkStep']} | name={b['name']}")

    # ── 5. Execute branch replay ──────────────────────────────────
    step("Branch replay (forked trace with overridden seed)", 5)
    r = requests.post(f"{ENGINE_URL}/replay/execute", json={
        "trace_id": trace_id,
        "branch_id": branch_id
    })
    assert r.status_code == 200, f"Branch replay failed: {r.status_code} {r.text}"
    branch_exec = r.json()
    print("Events consumed  :", branch_exec.get("events_consumed"))
    print("Branch fingerprint:", branch_exec.get("replay_fingerprint"))
    print("Branch meta      :", branch_exec.get("branch"))
    for line in branch_exec.get("stdout", "").split("\n"):
        if line.strip() and ("AgentTrace" in line or "Sandbox" in line or "Agent" in line):
            print("  ", line)

    # ── Result ────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    baseline_fp  = baseline.get("replay_fingerprint")
    branch_fp    = branch_exec.get("replay_fingerprint")

    print(f"Baseline fingerprint : {baseline_fp}")
    print(f"Branch   fingerprint : {branch_fp}")

    if baseline_fp and branch_fp:
        if baseline_fp == branch_fp:
            print("\n[IDENTICAL] Branch produced the SAME output as original.")
            print("  => Override did not change observable behavior (expected if seed isn't consumed by agent).")
        else:
            print("\n[DIVERGED]  Branch produced DIFFERENT output than original.")
            print("  => Fork engine working correctly. The branch is a true counterfactual.")
    
    print("=" * 60)
    print("Fork test complete.")


if __name__ == "__main__":
    trace_id = sys.argv[1] if len(sys.argv) > 1 else get_latest_trace_id()
    run_fork_test(trace_id)
