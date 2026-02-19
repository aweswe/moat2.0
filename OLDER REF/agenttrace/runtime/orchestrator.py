import os
import sys
import shutil
import time
import uuid
import traceback
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field

# AgentTrace Core
from agenttrace.core.tracer import Tracer
from agenttrace.afe.extractor import ExceptionExtractor, ExceptionContext
from agenttrace.afe.rca import RCAEngine
from agenttrace.afe.generator import CandidateGenerator
from agenttrace.afe.models import AFEDetection, RCAResult, AFECandidate
from agenttrace.afe.patcher import ApplyEngine

@dataclass
class SimulationResult:
    job_id: str
    status: str  # "success", "failed", "fixed"
    original_error: Optional[str] = None
    root_cause: Optional[str] = None
    applied_fix: Optional[AFECandidate] = None
    verification_passed: bool = False
    drift_data: Dict[str, Any] = field(default_factory=dict)

class AutoFixOrchestrator:
    """
    Manages the Agentic Loop: Trace -> Detect -> Fix -> Apply -> Verify.
    """
    
    def __init__(self, workspace_root: str):
        self.workspace_root = workspace_root
        self.tracer = Tracer()
        self.extractor = ExceptionExtractor()
        self.rca = RCAEngine()
        self.generator = CandidateGenerator()
        self.patcher = ApplyEngine()
        
    def run_simulation(self, entry_script: str, run_id: str = None) -> SimulationResult:
        """Run the full auto-fix loop on a target script."""
        if not run_id:
            run_id = str(uuid.uuid4())[:8]
            
        print(f"🔄 Orchestrator: Starting Run {run_id} for {entry_script}")
        
        # 1. Run Original (Baseline)
        print("▶️ Running Baseline...")
        error_context = self._run_safe(entry_script)
        
        if not error_context:
            print("✅ Baseline passed without error. No fix needed.")
            return SimulationResult(job_id=run_id, status="success")
            
        print(f"❌ Baseline failed: {error_context.exception_type}: {error_context.message}")
        
        # 2. Analyze (RCA)
        detection = AFEDetection(
             id=str(uuid.uuid4()),
             job_id=run_id,
             trace_id=f"trace_{run_id}_fail",
             failure_type="exception",
             confidence=1.0
        )
        
        rca_result = self.rca.analyze(detection, error_context.message, error_context)
        print(f"🔍 Root Cause: {rca_result.root_cause} (Conf: {rca_result.confidence})")
        
        # 3. Generate Fixes
        candidates = self.generator.generate(rca_result, detection.id, ctx=error_context)
        if not candidates:
            print("⚠️ No fix candidates generated.")
            return SimulationResult(
                job_id=run_id, 
                status="failed", 
                original_error=error_context.message,
                root_cause=rca_result.root_cause
            )
            
        # Pick best candidate (Rank 1)
        best_fix = candidates[0]
        print(f"💡 Selected Fix: {best_fix.summary}")
        
        # 4. Apply Fix (Safety: Backup first)
        backup_path = entry_script + ".bak"
        shutil.copy2(entry_script, backup_path)
        
        try:
            applied = self.patcher.apply_file_patch(entry_script, best_fix)
            if not applied:
                print("⚠️ Fix application failed.")
                return SimulationResult(
                    job_id=run_id, status="failed", original_error=error_context.message
                )
                
            # 5. Verify (Re-run)
            print("▶️ Running Verified Patch...")
            verify_context = self._run_safe(entry_script)
            
            success = (verify_context is None)
            status = "fixed" if success else "fix_failed"
            print(f"🏁 Verification: {'PASSED' if success else 'FAILED'}")
            
            return SimulationResult(
                job_id=run_id,
                status=status,
                original_error=error_context.message,
                root_cause=rca_result.root_cause,
                applied_fix=best_fix,
                verification_passed=success,
                drift_data={} # TODO: Add state capture
            )
            
        finally:
            # Restore backup for safety after run (Optional? User might want to keep it?)
            # For this 'Simulation', we should probably revert or make it configurable.
            # Let's revert by default to keep 'Simulation' pure, unless we add an 'Apply' flag.
            # For the demo, I'll KEEP the fix so we can inspect it, but maybe warn user.
            # actually, better to REVERT and return the diff in the result object for the UI to show.
            # But the user specifically asked for "Auto-apply Loop".
            # "Fork & Simulate" implies transient.
            # I will REVERT to be safe, as this is a simulation tool.
            print("actions: Reverting file to original state...")
            shutil.move(backup_path, entry_script)

    def _run_safe(self, script_path: str) -> Optional[ExceptionContext]:
        """Runs the script and returns ExceptionContext if it fails, else None."""
        # This is tricky because running a script in-process modifies sys.modules etc.
        # Ideally we use subprocess, but Tracer needs to attach.
        # For now, we'll try exec() with a managed tracer.
        
        try:
            # We must clear previous run state if possible, but hard in in-process.
            # A robust implementation would use `subprocess.run(["python", "-m", "agenttrace", ...])`
            # But we want to reuse our internal classes. 
            # Let's accept the risk of in-process exec for this prototype.
            
            with open(script_path) as f:
                code = compile(f.read(), script_path, 'exec')
                
            # Execute with Tracer active?
            # self.tracer.start_trace(...) # Logic depends on tracer implementation
            # Since Tracer is usually instantiated per run or global...
            # The current Tracer.start() logic hooks sys.settrace.
            
            # Simple exec for error catching
            # Execute with VFS Sandbox
            from agenttrace.vfs.patch import patch_io
            with patch_io():
                exec(code, {'__name__': '__main__'})
            return None
            
        except Exception:
            # Capture using our Extractor
            exc_type, exc_val, tb = sys.exc_info()
            
            # Mock event for extractor
            # In a real system, the Tracer would produce this event.
            # Here we manually extract from sys.exc_info
            
            tb_str = "".join(traceback.format_exception(exc_type, exc_val, tb))
            
            # Use Extractor
            # We need source code
            with open(script_path) as f:
                source = f.read()
                
            evt = {
                "type": "error",
                "exception_type": exc_type.__name__,
                "message": str(exc_val),
                "traceback": tb_str,
                "locals": {}, # Could capture locals if we had frame access
                "globals": {}
            }
            return self.extractor.extract(evt, source_code=source)
