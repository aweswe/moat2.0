import os
import psycopg2
from pathlib import Path

def load_env():
    root = Path(__file__).parent.parent
    env_path = root / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())

def verify():
    load_env()
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("POSTGRES_URL not set")
        return

    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    print("Tables in public schema:")
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    for row in cur.fetchall():
        print(f"  {row[0]}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    verify()
