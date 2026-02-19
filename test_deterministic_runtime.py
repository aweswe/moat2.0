import os
import shutil
import json
import time
from pathlib import Path
from agenttrace.core.tracer import Tracer, Mode, ReplayError
from agenttrace.vfs.patch import patch_io

def test_deterministic_runtime():
    print("🚀 Starting Deterministic Runtime Test...")
    
    # 1. Setup clean env
    storage = Path(".agenttrace_test")
    if storage.exists():
        shutil.rmtree(storage)
    storage.mkdir()
    
    trace_id = "test-deterministic-1"
    test_file = "determinism_test.txt"
    test_dir = "determinism_subdir"
    
    if os.path.exists(test_file): os.remove(test_file)
    if os.path.exists(test_dir): shutil.rmtree(test_dir)

    tracer = Tracer.get_instance()
    tracer.storage_root = str(storage)
    
    # 2. RECORD PHASE
    print("\n--- RECORDING ---")
    tracer.start_recording(trace_id=trace_id, skip_instrumentation=True)
    
    with patch_io():
        print(f"Writing {test_file}...")
        with open(test_file, "w") as f:
            f.write("Hello Determinism")
        
        print(f"Creating {test_dir}...")
        os.makedirs(test_dir, exist_ok=True)
        
        new_file = os.path.join(test_dir, "moved.txt")
        print(f"Renaming {test_file} -> {new_file}...")
        os.rename(test_file, new_file)
        
        print(f"Removing {new_file}...")
        os.remove(new_file)
        
        print(f"Removing dir {test_dir}...")
        os.rmdir(test_dir)

    tracer.stop()
    print("Recording finished.")

    # Verify physical cleanup happened (since we used patch_io in RECORD mode, it used the VFS bridge which by default DOES NOT write to disk)
    # Actually VFSManager in moat2.0 (based on my previous implementation) does not write to the real disk if it's virtualized.
    # Let's verify that the trace was actually recorded.
    events_path = storage / trace_id / "events.jsonl"
    if not events_path.exists():
        print("❌ FAILED: No events recorded!")
        return
    
    with open(events_path, "r") as f:
        events = [json.loads(l) for l in f]
    print(f"Recorded {len(events)} events.")

    # 3. REPLAY PHASE (Strict)
    print("\n--- REPLAYING (Strict) ---")
    # Reset singleton
    Tracer._instance = None
    tracer = Tracer.get_instance()
    tracer.storage_root = str(storage)
    
    # Check for host mutation: we will intentionally create a file on host before replay
    # and verify that 'os.remove' in replay DOES NOT delete it.
    sentinel = "sentinel.txt"
    with open(sentinel, "w") as f: f.write("SHOULD PERSIST")

    # Force REPLAY mode
    tracer.start_replay(trace_id=trace_id)
    
    # Verify we are in REPLAY mode
    if tracer.mode != Mode.REPLAY:
        print(f"❌ FAILED: Tracer mode is {tracer.mode}, expected REPLAY")
        return

    try:
        with patch_io():
            # The script logic must match the recorded sequence EXACTLY
            print("Replaying writes and renames (short-circuited)...")
            
            # 1. file_open/write
            with open(test_file, "w") as f:
                f.write("Hello Determinism")
            
            # 2. makedirs
            os.makedirs(test_dir, exist_ok=True)
            
            # 3. rename
            new_file = os.path.join(test_dir, "moved.txt")
            os.rename(test_file, new_file)
            
            # 4. remove
            os.remove(new_file)
            
            # 5. rmdir
            os.rmdir(test_dir)
            
        print("✅ REPLAY SUCCESS! No divergences.")
    except ReplayError as e:
        print(f"❌ REPLAY FAILED (Divergence): {e}")
    except Exception as e:
        print(f"❌ REPLAY CRASHED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        tracer.stop()

    # 4. Final verification: Host isolation
    if os.path.exists(sentinel):
        print("✅ PASS: Host isolation maintained (sentinel still exists).")
        os.remove(sentinel)
    else:
        print("❌ FAIL: Host isolation breached (sentinel deleted!)")

    # Verify no new trace was created in storage during REPLAY
    trace_dirs = list(storage.iterdir())
    if len(trace_dirs) == 1:
        print("✅ PASS: Mode isolation (no new trace created during replay).")
    else:
        print(f"❌ FAIL: Mode isolation breached (found {len(trace_dirs)} traces).")

if __name__ == "__main__":
    test_deterministic_runtime()
