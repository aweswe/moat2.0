import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def deploy_trace_events():
    db_url = os.environ.get("POSTGRES_URL")
    if not db_url:
        print("❌ POSTGRES_URL missing in .env")
        return

    sql_path = "agenttrace/worker/trace_events.sql"
    if not os.path.exists(sql_path):
        print(f"❌ SQL file not found: {sql_path}")
        return

    try:
        print(f"🚀 Connecting to database to deploy {sql_path}...")
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        
        with open(sql_path, "r", encoding="utf-8") as f:
            sql = f.read()
            
        print("📜 Executing migration script...")
        cur.execute(sql)
            
        print("✅ trace_events table and lineage columns deployed successfully.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error deploying schema: {e}")

if __name__ == "__main__":
    deploy_trace_events()
