#!/usr/bin/env python3
"""
AgentTrace Branch Handler
Creates branches (forks) from a trace at a specific step.
Stores branch metadata in Supabase `branches` table.

Usage:
    python scripts/branch_handler.py create --trace-id <id> --fork-step <n> [--override '{"key":"val"}'] [--name <name>]
    python scripts/branch_handler.py list --trace-id <id>

Outputs clean JSON to stdout.
"""
import sys
import os
import json
import argparse
import hashlib
import time
import uuid
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def load_env():
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())


def get_supabase_client():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    if url and not url.endswith("/"):
        url += "/"
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError("Supabase env vars not set")
    from supabase import create_client
    return create_client(url, key)


def download_events(trace_id: str) -> list:
    """Download events.jsonl - local first, then cloud."""
    local_path = PROJECT_ROOT / ".agenttrace" / "traces" / trace_id / "events.jsonl"
    if local_path.exists():
        events = []
        with open(local_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        events.append(json.loads(line))
                    except Exception:
                        continue
        events.sort(key=lambda e: e.get("seq", e.get("step", 0)))
        return events

    # Cloud download
    client = get_supabase_client()
    blob = client.storage.from_("traces").download(f"{trace_id}/events.jsonl")
    if not blob:
        raise FileNotFoundError(f"No events.jsonl found for trace {trace_id}")
    text = blob.decode("utf-8") if isinstance(blob, (bytes, bytearray)) else blob

    events = []
    for line in text.splitlines():
        line = line.strip()
        if line:
            try:
                events.append(json.loads(line))
            except Exception:
                continue
    events.sort(key=lambda e: e.get("seq", e.get("step", 0)))
    return events


def compute_hash(events: list, up_to_step: int) -> str:
    """SHA256 of events 0..up_to_step (deterministic, no timestamps)."""
    filtered = []
    for ev in events:
        seq = ev.get("seq", ev.get("step", 0))
        if seq > up_to_step:
            break
        clean = {k: v for k, v in ev.items() if k != "timestamp"}
        filtered.append(json.dumps(clean, sort_keys=True, separators=(",", ":")))
    content = "\n".join(filtered)
    return hashlib.sha256(content.encode()).hexdigest()


def get_org_id_for_trace(client, trace_id: str) -> str | None:
    """Look up org_id from the traces table."""
    try:
        result = client.table("traces").select("org_id").eq("id", trace_id).execute()
        if result.data:
            return result.data[0].get("org_id")
        print(f"[branch_handler] Warning: no trace found with id={trace_id}", file=sys.stderr)
    except Exception as e:
        print(f"[branch_handler] get_org_id error: {e}", file=sys.stderr)
    return None


def cmd_create(args):
    load_env()

    # Load parent events
    events = download_events(args.trace_id)
    if not events:
        raise RuntimeError(f"No events found for trace {args.trace_id}")

    # Compute parent hash at fork point
    parent_hash = compute_hash(events, args.fork_step)

    # Parse override payload
    override_payload = None
    if args.override:
        try:
            override_payload = json.loads(args.override)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON override: {e}")

    # Generate branch ID
    branch_name = args.name or f"fork-step-{args.fork_step}"
    branch_id = f"{args.trace_id[:8]}-branch-{str(uuid.uuid4())[:8]}"

    # Get fork events (for the branch record context)
    fork_events = [e for e in events if e.get("seq", e.get("step", 0)) <= args.fork_step]

    # Build branch record matching actual Supabase schema:
    # id, trace_id, org_id, name, fork_step, overrides, created_by, created_at
    overrides_payload = {}
    if override_payload:
        # Map the override to the specific fork step sequence number
        overrides_payload["_override"] = {str(args.fork_step): override_payload}
    overrides_payload["_parent_hash"] = parent_hash
    overrides_payload["_fork_events_count"] = len(fork_events)

    branch_record = {
        # Do NOT include 'id' — Supabase generates a UUID automatically
        "trace_id": args.trace_id,
        "fork_step": args.fork_step,
        "name": branch_name,
        "overrides": overrides_payload,
    }

    saved_to_cloud = False
    cloud_branch_id = branch_id  # fallback
    try:
        client = get_supabase_client()

        # org_id is NOT NULL — must include it
        org_id = get_org_id_for_trace(client, args.trace_id)
        if not org_id:
            raise RuntimeError(f"Cannot find org_id for trace {args.trace_id}")
        branch_record["org_id"] = org_id

        result = client.table("branches").insert(branch_record).execute()
        if result.data:
            cloud_branch_id = result.data[0]["id"]  # use the auto-generated UUID
        saved_to_cloud = True
    except Exception as e:
        print(f"[branch_handler] Supabase insert error: {e}", file=sys.stderr)
        # Save locally as fallback
        local_dir = PROJECT_ROOT / ".agenttrace" / "branches"
        local_dir.mkdir(parents=True, exist_ok=True)
        local_rec = dict(branch_record)
        local_rec["id"] = branch_id
        with open(local_dir / f"{branch_id}.json", "w") as f:
            json.dump(local_rec, f, indent=2)

    result = {
        "success": True,
        "branchId": cloud_branch_id,
        "parentTraceId": args.trace_id,
        "forkStep": args.fork_step,
        "parentHash": parent_hash,
        "name": branch_name,
        "savedToCloud": saved_to_cloud,
        "forkEventCount": len(fork_events),
    }
    print(json.dumps(result))
    return 0


def cmd_list(args):
    load_env()
    branches = []

    # Try Supabase first
    try:
        client = get_supabase_client()
        query = client.table("branches").select("*")
        if args.trace_id:
            query = query.eq("trace_id", args.trace_id)  # actual column name
        result = query.order("created_at", desc=True).execute()
        branches = result.data or []
    except Exception as e:
        print(f"[branch_handler] list error: {e}", file=sys.stderr)
        local_dir = PROJECT_ROOT / ".agenttrace" / "branches"
        if local_dir.exists():
            for f in local_dir.glob("*.json"):
                try:
                    with open(f) as fp:
                        data = json.load(fp)
                    if args.trace_id and data.get("parent_trace_id") != args.trace_id:
                        continue
                    branches.append(data)
                except Exception:
                    continue

    # Normalize to consistent camelCase schema for the frontend
    normalized = []
    for b in branches:
        overrides = b.get("overrides") or {}
        normalized.append({
            "id": b.get("id"),
            "parentTraceId": b.get("trace_id") or b.get("parent_trace_id"),
            "forkStep": b.get("fork_step", 0),
            "name": b.get("name"),
            "parentHash": overrides.get("_parent_hash") or b.get("parent_hash"),
            "createdAt": b.get("created_at"),
            "overridePayload": overrides.get("_override") or b.get("override_payload"),
        })

    print(json.dumps({"success": True, "branches": normalized}))
    return 0


def main():
    parser = argparse.ArgumentParser(description="AgentTrace branch handler")
    subparsers = parser.add_subparsers(dest="command")

    create_p = subparsers.add_parser("create")
    create_p.add_argument("--trace-id", required=True)
    create_p.add_argument("--fork-step", type=int, required=True)
    create_p.add_argument("--override", default=None, help="JSON string for event payload override at fork step")
    create_p.add_argument("--name", default=None)

    list_p = subparsers.add_parser("list")
    list_p.add_argument("--trace-id", default=None)

    args = parser.parse_args()

    try:
        if args.command == "create":
            sys.exit(cmd_create(args))
        elif args.command == "list":
            sys.exit(cmd_list(args))
        else:
            parser.print_help()
            sys.exit(1)
    except Exception as e:
        import traceback
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
