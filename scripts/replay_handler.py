#!/usr/bin/env python3
"""
AgentTrace Replay Handler
Pure-event state hydration — no script re-execution needed.
Called by the Next.js /api/replay route via spawn.

Usage:
    python scripts/replay_handler.py --trace-id <id> [--step <n>] [--branch <branch_id>]

Outputs clean JSON to stdout:
    { "success": true, "state": {...}, "events": [...], "eventCount": N }
"""
import sys
import os
import json
import argparse
import hashlib
from pathlib import Path

# Ensure project root is in path
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
        return None
    from supabase import create_client
    return create_client(url, key)


def download_events_from_supabase(trace_id: str) -> list:
    """Download events.jsonl from Supabase Storage."""
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase client could not be initialized")

    try:
        blob = client.storage.from_("traces").download(f"{trace_id}/events.jsonl")
        if not blob:
            raise FileNotFoundError(f"No events.jsonl found in Supabase for trace {trace_id}")
        text = blob.decode("utf-8") if isinstance(blob, (bytes, bytearray)) else blob
    except Exception as e:
        raise RuntimeError(f"Supabase download failed: {e}")

    events = []
    for line in text.splitlines():
        line = line.strip()
        if line:
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    events.sort(key=lambda e: e.get("seq", e.get("step", 0)))
    return events


def download_metadata_from_supabase(trace_id: str) -> dict:
    """Download metadata.json from Supabase Storage."""
    try:
        client = get_supabase_client()
        if not client: return {}
        blob = client.storage.from_("traces").download(f"{trace_id}/metadata.json")
        if blob:
            text = blob.decode("utf-8") if isinstance(blob, (bytes, bytearray)) else blob
            return json.loads(text)
    except Exception:
        pass
    return {}


def load_events_local(trace_id: str) -> list:
    """Try to load events from local .agenttrace directory."""
    local_path = PROJECT_ROOT / ".agenttrace" / "traces" / trace_id / "events.jsonl"
    if not local_path.exists():
        return []
    events = []
    with open(local_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    events.sort(key=lambda e: e.get("seq", e.get("step", 0)))
    return events


def apply_branch_overrides(events: list, branch_id: str) -> list:
    """Load branch overrides and apply them to the events list."""
    overrides = {}

    try:
        client = get_supabase_client()
        if client:
            result = client.table("branches").select("*").eq("id", branch_id).execute()
            if result.data:
                branch = result.data[0]
                overrides = branch.get("overrides") or {}
                # Handle legacy column name too
                if not overrides:
                    overrides = branch.get("override_payload") or {}
    except Exception as e:
        print(f"[replay_handler] Supabase overrides error: {e}", file=sys.stderr)

    # Fallback: local branch file
    if not overrides:
        local_branch = PROJECT_ROOT / ".agenttrace" / "branches" / f"{branch_id}.json"
        if local_branch.exists():
            with open(local_branch) as f:
                branch_data = json.load(f)
                overrides = branch_data.get("overrides", {})

    # Apply overrides: key is string seq number
    patched = []
    for ev in events:
        seq_key = str(ev.get("seq", ""))
        # Check both raw override and the new dict-wrapped override
        ov = overrides.get(seq_key) or overrides.get("_override", {}).get(seq_key)
        if ov:
            ev = dict(ev)
            ev["payload"] = ov
            ev["_branched"] = True
        patched.append(ev)
    return patched


def hydrate_state(events: list, target_step: int | None) -> dict:
    """Replay events up to target_step using the core state engine."""
    try:
        from agenttrace.core.replay import hydrate_state_from_events
        max_step = target_step if target_step is not None else 999999
        return hydrate_state_from_events({}, events, max_step)
    except ImportError:
        # Minimal fallback if import fails
        state: dict = {}
        for ev in events:
            seq = ev.get("seq", ev.get("step", 0))
            if target_step is not None and seq > target_step:
                break
            t = ev.get("type", "")
            payload = ev.get("payload", {})
            if t == "file_write" and payload.get("path"):
                state.setdefault("_vfs", {})[payload["path"]] = payload.get("content")
            elif t == "state_update" and isinstance(payload, dict):
                state.update(payload)
        return state


def compute_events_hash(events: list, up_to_step: int | None) -> str:
    """Compute SHA256 of events (excluding timestamps) up to a step."""
    filtered = []
    for ev in events:
        seq = ev.get("seq", ev.get("step", 0))
        if up_to_step is not None and seq > up_to_step:
            break
        clean = {k: v for k, v in ev.items() if k not in ("timestamp", "_branched")}
        filtered.append(json.dumps(clean, sort_keys=True, separators=(",", ":")))
    content = "\n".join(filtered)
    return hashlib.sha256(content.encode()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description="AgentTrace pure-event replay handler")
    parser.add_argument("--trace-id", required=True, help="Trace ID to replay")
    parser.add_argument("--step", type=int, default=None, help="Hydrate state up to this step (default: all)")
    parser.add_argument("--branch", default=None, help="Branch ID to apply overrides from")
    args = parser.parse_args()

    load_env()

    try:
        # 1. Load events (local first, then cloud)
        events = load_events_local(args.trace_id)
        if not events:
            events = download_events_from_supabase(args.trace_id)

        if not events:
            print(json.dumps({"success": False, "error": f"No events found for trace {args.trace_id}"}))
            sys.exit(1)

        # 2. Apply branch overrides if requested
        if args.branch:
            events = apply_branch_overrides(events, args.branch)

        # 3. Determine target step
        target_step = args.step
        all_seqs = [e.get("seq", e.get("step", 0)) for e in events]
        max_seq = max(all_seqs) if all_seqs else 0

        # 4. Hydrate state
        state = hydrate_state(events, target_step)

        # 5. Slice events up to target_step for the response
        if target_step is not None:
            visible_events = [e for e in events if e.get("seq", e.get("step", 0)) <= target_step]
        else:
            visible_events = events

        # 6. Compute parent hash (for branch diff)
        parent_hash = compute_events_hash(events, target_step)

        # 7. Download metadata
        metadata = download_metadata_from_supabase(args.trace_id)

        result = {
            "success": True,
            "traceId": args.trace_id,
            "branch": args.branch,
            "step": target_step,
            "maxStep": max_seq,
            "eventCount": len(events),
            "visibleEventCount": len(visible_events),
            "events": visible_events,
            "state": state,
            "parentHash": parent_hash,
            "metadata": metadata,
        }

        print(json.dumps(result, default=str))
        sys.exit(0)

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
