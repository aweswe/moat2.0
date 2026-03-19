import os
import sys
import json
import subprocess
import shutil

# Secure environment configurations
traces_dir = os.path.join(os.path.dirname(__file__), "traces")
input_dir = os.path.join(traces_dir, "input")
output_dir = os.path.join(traces_dir, "output")
trace_input_path = os.path.join(input_dir, "trace.json")
trace_result_path = os.path.join(output_dir, "result.json")

os.makedirs(input_dir, exist_ok=True)
os.makedirs(output_dir, exist_ok=True)

# Generate a mock valid trace with a signature mapping to the container's AGENTTRACE_SIGNING_KEY
SIGNING_KEY = "test_signing_key_123"
os.environ["AGENTTRACE_SIGNING_KEY"] = SIGNING_KEY

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "apps/backend"))
from agenttrace.signer import sign_trace

# Generate a mock sequence for the container to evaluate
events = [
    {
        "seq": 0,
        "type": "agent_start",
        "payload": {"seed": 42}
    }
]

# Write a dummy agent payload script the sandbox will dynamically load
dummy_agent_path = os.path.join(input_dir, "sandbox_test_agent.py")
with open(dummy_agent_path, "w") as f:
    f.write("def run():\n    pass\n")

# Sign the trace cryptographically exactly as it would be injected via the recording module
signature = sign_trace(events, SIGNING_KEY)

baseline_trace = {
    "agent_module": "sandbox_test_agent",
    "agent_fn": "run",
    "signature": signature,
    "events": events
}

with open(trace_input_path, "w") as f:
    json.dump(baseline_trace, f)

print("[Test Driver] Building Docker Container...")
subprocess.run("docker build -t agenttrace/governance:py3.12.1 -f docker/governance/Dockerfile .", shell=True, check=True)

# Remove the old result file if present
if os.path.exists(trace_result_path):
    os.remove(trace_result_path)

print(f"[Test Driver] Running the container via docker-compose (Key: {SIGNING_KEY})...")
try:
    subprocess.run(f"docker-compose -f docker-compose.governance.yml up --abort-on-container-exit", shell=True, check=True)
except subprocess.CalledProcessError as e:
    print(f"[Test Driver] Container exited with non-zero code. Output might hold trace error validation divergence logs...")

print("[Test Driver] Validating outputs...")
if not os.path.exists(trace_result_path):
    print(f"FAIL: Result file {trace_result_path} was not generated.")
    sys.exit(1)

with open(trace_result_path, "r") as f:
    result = json.load(f)

if result.get("status") == "pass":
    print(f"PASS: Governance Replay executed perfectly. Trace Fingerprint [{result.get('fingerprint')}]. Context evaluated {result.get('duration_ms')}ms.")
    sys.exit(0)
else:
    print(f"FAIL: Governance Replay Diverged / Errored: {result}")
    sys.exit(1)
