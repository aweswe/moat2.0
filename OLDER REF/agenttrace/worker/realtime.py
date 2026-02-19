"""
Real-time Worker using Supabase Realtime.

Instead of polling the database, this worker subscribes to real-time
changes on the jobs table and processes jobs instantly when they appear.
"""
import os
import sys
import asyncio
import uuid
import signal
from typing import Optional, Dict, Any

# Load env vars
try:
    from dotenv import load_dotenv
    load_dotenv("frontend/.env.local")
    load_dotenv(".env.local")
    load_dotenv()
except ImportError:
    pass

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

# Configuration
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
IS_SERVICE = bool(SUPABASE_KEY)

if not SUPABASE_KEY:
    SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")


class RealtimeWorker:
    """
    Worker that uses Supabase Realtime for instant job notifications.
    
    Instead of polling every 1-30 seconds, this worker receives push
    notifications when new jobs are inserted into the jobs table.
    """
    
    def __init__(self):
        self.worker_id = str(uuid.uuid4())
        self.running = True
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.channel = None
        self._processing = set()  # Track jobs being processed
        
        mode = "SERVICE_ROLE ⚡" if IS_SERVICE else "ANON (RLS Restricted) ⚠️"
        print(f"[RealtimeWorker] Initialized ID={self.worker_id[:8]} Mode={mode}")
    
    async def start(self):
        """Start the realtime subscription and process jobs."""
        print(f"[RealtimeWorker] Connecting to {SUPABASE_URL}")
        
        # Subscribe to jobs table changes
        self.channel = self.client.channel("jobs_realtime")
        
        # Listen for new job insertions with status='queued'
        self.channel.on_postgres_changes(
            event="INSERT",
            schema="public",
            table="jobs",
            callback=self._on_job_inserted
        ).subscribe(self._on_subscribe)
        
        print("[RealtimeWorker] ✅ Subscribed to jobs table")
        print("[RealtimeWorker] Waiting for jobs...")
        
        # Process any existing queued jobs on startup
        await self._process_existing_jobs()
        
        # Keep alive
        while self.running:
            await asyncio.sleep(1)
    
    def _on_subscribe(self, status, error=None):
        """Called when subscription status changes."""
        if status == "SUBSCRIBED":
            print("[RealtimeWorker] 🔌 Connected to Realtime")
        elif status == "CHANNEL_ERROR":
            print(f"[RealtimeWorker] ❌ Channel error: {error}")
        elif status == "TIMED_OUT":
            print("[RealtimeWorker] ⏱️ Connection timed out, retrying...")
    
    def _on_job_inserted(self, payload):
        """Called when a new job is inserted."""
        try:
            new_job = payload.get("new", payload)
            job_id = new_job.get("id")
            status = new_job.get("status")
            
            print(f"[RealtimeWorker] 📥 New job: {job_id} status={status}")
            
            # Only process queued jobs
            if status == "queued" and job_id not in self._processing:
                self._processing.add(job_id)
                # Schedule job processing
                asyncio.create_task(self._process_job_async(new_job))
        except Exception as e:
            print(f"[RealtimeWorker] Error handling job event: {e}")
    
    async def _process_existing_jobs(self):
        """Process any queued jobs that existed before we subscribed."""
        try:
            response = self.client.table("jobs") \
                .select("*") \
                .eq("status", "queued") \
                .order("created_at", desc=False) \
                .limit(10) \
                .execute()
            
            jobs = response.data or []
            print(f"[RealtimeWorker] Found {len(jobs)} existing queued jobs")
            
            for job in jobs:
                if job["id"] not in self._processing:
                    self._processing.add(job["id"])
                    asyncio.create_task(self._process_job_async(job))
        except Exception as e:
            print(f"[RealtimeWorker] Error fetching existing jobs: {e}")
    
    async def _process_job_async(self, job: Dict[str, Any]):
        """Process a job asynchronously."""
        job_id = job.get("id")
        
        try:
            # Claim the job (optimistic locking)
            update_result = self.client.table("jobs") \
                .update({
                    "status": "processing",
                    "started_at": "now()",
                    "worker_id": self.worker_id
                }) \
                .eq("id", job_id) \
                .eq("status", "queued") \
                .execute()
            
            if not update_result.data:
                print(f"[RealtimeWorker] Job {job_id[:8]} already claimed by another worker")
                self._processing.discard(job_id)
                return
            
            print(f"[RealtimeWorker] ▶️ Processing job {job_id[:8]}")
            
            # Import and use the existing job processing logic
            from agenttrace.worker.main import AgentWorker
            
            # Create a temporary worker to process the job
            worker = AgentWorker()
            worker._process_job(job)
            
            print(f"[RealtimeWorker] ✅ Completed job {job_id[:8]}")
            
        except Exception as e:
            print(f"[RealtimeWorker] ❌ Job {job_id[:8]} failed: {e}")
            
            # Mark as failed
            try:
                self.client.table("jobs") \
                    .update({
                        "status": "failed",
                        "error_message": str(e)
                    }) \
                    .eq("id", job_id) \
                    .execute()
            except Exception:
                pass
        finally:
            self._processing.discard(job_id)
    
    def stop(self):
        """Stop the worker gracefully."""
        print("[RealtimeWorker] Stopping...")
        self.running = False
        if self.channel:
            self.channel.unsubscribe()


async def main():
    """Main entry point for the realtime worker."""
    worker = RealtimeWorker()
    
    # Handle shutdown signals
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        print("\n[RealtimeWorker] Received shutdown signal")
        worker.stop()
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            signal.signal(sig, lambda s, f: signal_handler())
    
    try:
        await worker.start()
    except KeyboardInterrupt:
        worker.stop()
    
    print("[RealtimeWorker] Exited")


if __name__ == "__main__":
    print("=" * 60)
    print("AgentTrace Realtime Worker")
    print("=" * 60)
    asyncio.run(main())
