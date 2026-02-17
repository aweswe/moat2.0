import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def apply_db_fixes():
    db_url = os.environ.get("POSTGRES_URL")
    if not db_url:
        print("POSTGRES_URL missing.")
        return

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Adding 'email' column to profiles...")
        cur.execute("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;")
        
        print("Enabling RLS on profiles (ensuring)...")
        cur.execute("ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;")
        
        print("Applying permissive RLS policies for profiles...")
        # Clean up existing policies if any to avoid conflicts
        policies = [
            "DROP POLICY IF EXISTS \"Users see own profile\" ON public.profiles;",
            "DROP POLICY IF EXISTS \"Users insert own profile\" ON public.profiles;",
            "DROP POLICY IF EXISTS \"Users update own profile\" ON public.profiles;",
            "DROP POLICY IF EXISTS \"Permissive insert for authenticated\" ON public.profiles;",
            "CREATE POLICY \"Users see own profile\" ON public.profiles FOR SELECT USING (user_id = auth.uid());",
            "CREATE POLICY \"Users update own profile\" ON public.profiles FOR UPDATE USING (user_id = auth.uid());",
            "CREATE POLICY \"Permissive insert for authenticated\" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);"
        ]
        
        for p in policies:
            print(f"Executing: {p}")
            cur.execute(p)
            
        print("✅ Database fixes applied successfully.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error applying database fixes: {e}")

if __name__ == "__main__":
    apply_db_fixes()
