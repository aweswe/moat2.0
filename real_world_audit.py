import os
import groq
import traceback
import sys
import io
from agenttrace.core.tracer import Tracer

# Force UTF-8 for windows terminal output
if sys.platform == "win32":
    import codecs
    # sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    # sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

def real_world_simulation():
    tracer = Tracer.get_instance()
    tracer.start_recording()
    
    trace_id = tracer.trace_id
    # Use explicit encoding-safe printing
    def safe_print(msg):
        try:
            print(str(msg).encode('ascii', 'ignore').decode('ascii'), flush=True)
        except:
            pass

    safe_print(f"🚀 Starting Real-World Audit (Trace: {trace_id})")
    
    try:
        client = groq.Groq(api_key=os.environ.get("GROQ_API_KEY"))
        
        # Step 1: Read internal SDK file
        vfs_path = os.path.join("agenttrace", "vfs", "patch.py")
        safe_print(f"📖 Reading {vfs_path}...")
        with open(vfs_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Step 2: Use LLM to analyze the code
        safe_print("🤖 Asking Groq to audit the VFS implementation...")
        
        # Capture stdout/stderr during LLM call to avoid terminal encoding errors from instrumentation
        # f = io.StringIO()
        # with contextlib.redirect_stdout(f):
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a senior security engineer. Audit the following Python code for any obvious flaws or gaps in its virtual filesystem (VFS) implementation. Be concise."
                },
                {
                    "role": "user",
                    "content": code[:2000] # Very small for stability
                }
            ],
            model="llama-3.3-70b-versatile",
        )
        
        audit_report = chat_completion.choices[0].message.content
        safe_print("✅ Audit complete.")

        # Step 3: Write the report to a virtual file
        report_path = "vfs_security_audit.md"
        safe_print(f"✍️ Writing audit report to {report_path}...")
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(audit_report)

        # Step 4: Finalize
        time_to_wait = 3
        safe_print(f"⏳ Waiting {time_to_wait}s for final sync...")
        import time
        time.sleep(time_to_wait)
        
    except Exception as e:
        safe_print(f"❌ Simulation failed: {e}")
    finally:
        tracer.stop()
        safe_print(f"🏁 Simulation finished for {trace_id}. Check the dashboard!")

if __name__ == "__main__":
    real_world_simulation()
