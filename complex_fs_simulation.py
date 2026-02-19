import os
import shutil
import time
from agenttrace.core.tracer import Tracer

def complex_fs_simulation():
    tracer = Tracer.get_instance()
    tracer.start_recording()
    
    trace_id = tracer.trace_id
    print(f"[START] Starting Complex Filesystem Simulation (Trace: {trace_id})", flush=True)
    
    work_dir = "temp_simulation_workspace"
    if os.path.exists(work_dir):
        shutil.rmtree(work_dir)
    os.makedirs(work_dir)
    
    # Step 1: Create a batch of files
    print(f"[FILES] Creating 20 files in {work_dir}...", flush=True)
    for i in range(20):
        with open(os.path.join(work_dir, f"data_{i}.txt"), "w") as f:
            f.write(f"This is sample data for file {i}\n" * 10)
    
    # Step 2: Read and "Process" them
    print("[READ] Reading and processing files...", flush=True)
    all_content = []
    for i in range(20):
        path = os.path.join(work_dir, f"data_{i}.txt")
        with open(path, "r") as f:
            all_content.append(f.read().splitlines()[0])
        time.sleep(0.05)
    
    # Step 3: Categorize them into subdirectories
    print("[MOVE] Categorizing files...", flush=True)
    even_dir = os.path.join(work_dir, "even")
    odd_dir = os.path.join(work_dir, "odd")
    os.makedirs(even_dir)
    os.makedirs(odd_dir)
    
    for i in range(20):
        old_path = os.path.join(work_dir, f"data_{i}.txt")
        dest = even_dir if i % 2 == 0 else odd_dir
        new_path = os.path.join(dest, f"processed_data_{i}.txt")
        os.rename(old_path, new_path)
    
    # Step 4: Write summary report
    print("[REPORT] writing final summary report...", flush=True)
    with open(os.path.join(work_dir, "summary.json"), "w") as f:
        import json
        json.dump({"files_processed": 20, "summary": all_content}, f)

    # Step 5: Finalize
    time_to_wait = 2
    print(f"[WAIT] Waiting {time_to_wait}s for final sync...", flush=True)
    time.sleep(time_to_wait)
    
    tracer.stop()
    print(f"[DONE] Simulation finished for {trace_id}. Check the dashboard!", flush=True)

if __name__ == "__main__":
    complex_fs_simulation()
