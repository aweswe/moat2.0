import psycopg2
import os
from pathlib import Path

def load_env():
    """Load .env file if it exists."""
    env_path = Path(".env")
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key] = val
        print(f"[OK] Loaded environment from {env_path}")

def re_enable_rls():
    load_env()
    postgres_url = os.environ.get("POSTGRES_URL")
    if not postgres_url:
        print("Error: POSTGRES_URL not found in environment.")
        return

    try:
        conn = psycopg2.connect(postgres_url)
        conn.autocommit = True
        cur = conn.cursor()

        print("Enabling RLS on trace_events...")
        cur.execute("ALTER TABLE public.trace_events ENABLE ROW LEVEL SECURITY;")
        
        # Add policy for service role to insert
        print("Adding insert policy for service_role...")
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE tablename = 'trace_events' AND policyname = 'Allow service_role insert'
                ) THEN
                    CREATE POLICY "Allow service_role insert" 
                    ON public.trace_events 
                    FOR INSERT 
                    TO service_role 
                    WITH CHECK (true);
                END IF;
            END $$;
        """)
        
        print("RLS re-enabled and policy added.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error re-enabling RLS: {e}")

if __name__ == "__main__":
    re_enable_rls()
