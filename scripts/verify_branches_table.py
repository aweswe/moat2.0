import psycopg2

conn = psycopg2.connect(
    "postgresql://postgres.wddxzszcjturywfzjxjy:Poprockpop007@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
)
cur = conn.cursor()

cur.execute(
    "SELECT column_name, data_type FROM information_schema.columns "
    "WHERE table_name = %s ORDER BY ordinal_position",
    ("branches",)
)
rows = cur.fetchall()
print("branches table columns:")
for r in rows:
    print(f"  {r[0]:25s}  {r[1]}")

cur.execute("SELECT COUNT(*) FROM public.branches")
count = cur.fetchone()[0]
print(f"\nRow count: {count}")

cur.close()
conn.close()
