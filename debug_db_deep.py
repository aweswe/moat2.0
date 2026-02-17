import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def deep_check():
    db_url = os.environ.get("POSTGRES_URL")
    if not db_url:
        print("POSTGRES_URL missing.")
        return

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        print("--- TABLE SCHEMA: profiles ---")
        cur.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'profiles'
            ORDER BY ordinal_position;
        """)
        for row in cur.fetchall():
            print(row)
            
        print("\n--- RLS POLICIES: profiles ---")
        cur.execute("""
            SELECT policyname, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'profiles';
        """)
        for row in cur.fetchall():
            print(row)
            
        print("\n--- TABLE RLS STATUS ---")
        cur.execute("SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'profiles';")
        print(cur.fetchone())

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    deep_check()
