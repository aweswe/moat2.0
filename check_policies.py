import psycopg2
import os
from pathlib import Path

def load_env():
    env_path = Path(".env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ[k] = v

def check_policies():
    load_env()
    conn = psycopg2.connect(os.environ["POSTGRES_URL"])
    cur = conn.cursor()
    cur.execute("SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'trace_events'")
    policies = cur.fetchall()
    print("--- Policies for trace_events ---")
    for p in policies:
        print(f"Name: {p[0]}")
        print(f"Roles: {p[1]}")
        print(f"Cmd: {p[2]}")
        print(f"Qual: {p[3]}")
        print(f"With Check: {p[4]}")
        print("-" * 20)
    
    cur.execute("SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'trace_events'")
    rls_enabled = cur.fetchone()[0]
    print(f"RLS Enabled: {rls_enabled}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_policies()
