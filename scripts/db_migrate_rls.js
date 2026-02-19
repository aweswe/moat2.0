
const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.POSTGRES_URL;

const sql = `
-- 1. Enable RLS
ALTER TABLE traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- 2. Create Isolation Policies (Deriving org_id from JWT)
-- Note: We use COALESCE or similar if we want a fallback, but for strict isolation we use exactly the claim.
DROP POLICY IF EXISTS "org_isolation_traces" ON traces;
CREATE POLICY "org_isolation_traces" ON traces 
FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

DROP POLICY IF EXISTS "org_isolation_jobs" ON jobs;
CREATE POLICY "org_isolation_jobs" ON jobs 
FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

DROP POLICY IF EXISTS "org_isolation_branches" ON branches;
CREATE POLICY "org_isolation_branches" ON branches 
FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- 3. Enforce Not Null (Ensuring all future data is bound)
ALTER TABLE traces ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE jobs ALTER COLUMN org_id SET NOT NULL;

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_traces_org_id ON traces(org_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON jobs(org_id);

-- 5. Add Profile Role Constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('owner', 'dev', 'viewer');
    END IF;
END $$;

-- Handle existing default and type conversion
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'viewer'::user_role;
`;

async function migrate() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to database. Executing migration...");
        await client.query(sql);
        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

migrate();
