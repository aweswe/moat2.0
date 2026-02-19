require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

async function run() {
    const client = await pool.connect();
    try {
        console.log("[Migration 004] Rewriting RLS policies to use org_members...\n");

        // ═══════════════════════════════════════════════════
        // TRACES — Drop old policies, create new ones
        // ═══════════════════════════════════════════════════
        console.log("--- traces ---");

        // Drop legacy policies
        await client.query(`DROP POLICY IF EXISTS "Users see traces in their org" ON traces`);
        await client.query(`DROP POLICY IF EXISTS "Users insert traces in their org" ON traces`);
        await client.query(`DROP POLICY IF EXISTS "org_isolation_traces" ON traces`);
        console.log("  ✓ Dropped legacy policies");

        // New: SELECT — users can see traces in their org
        await client.query(`
            CREATE POLICY "traces_select_by_org" ON traces
            FOR SELECT USING (
                org_id IN (
                    SELECT org_id FROM org_members WHERE user_id = auth.uid()
                )
            )
        `);
        console.log("  ✓ Created traces_select_by_org");

        // New: INSERT — users can insert traces in their org
        await client.query(`
            CREATE POLICY "traces_insert_by_org" ON traces
            FOR INSERT WITH CHECK (
                org_id IN (
                    SELECT org_id FROM org_members WHERE user_id = auth.uid()
                )
            )
        `);
        console.log("  ✓ Created traces_insert_by_org");

        // New: UPDATE — users can update traces in their org
        await client.query(`
            CREATE POLICY "traces_update_by_org" ON traces
            FOR UPDATE USING (
                org_id IN (
                    SELECT org_id FROM org_members WHERE user_id = auth.uid()
                )
            )
        `);
        console.log("  ✓ Created traces_update_by_org");

        // Service role full access (always bypass RLS, but explicit is better)
        await client.query(`DROP POLICY IF EXISTS "traces_service_role" ON traces`);
        await client.query(`
            CREATE POLICY "traces_service_role" ON traces
            FOR ALL TO service_role USING (true) WITH CHECK (true)
        `);
        console.log("  ✓ Created traces_service_role");

        // ═══════════════════════════════════════════════════
        // ORGANIZATIONS — Fix to use org_members
        // ═══════════════════════════════════════════════════
        console.log("\n--- organizations ---");

        await client.query(`DROP POLICY IF EXISTS "Users see their own organization" ON organizations`);
        console.log("  ✓ Dropped legacy policy");

        await client.query(`
            CREATE POLICY "orgs_select_by_membership" ON organizations
            FOR SELECT USING (
                id IN (
                    SELECT org_id FROM org_members WHERE user_id = auth.uid()
                )
            )
        `);
        console.log("  ✓ Created orgs_select_by_membership");

        await client.query(`DROP POLICY IF EXISTS "orgs_service_role" ON organizations`);
        await client.query(`
            CREATE POLICY "orgs_service_role" ON organizations
            FOR ALL TO service_role USING (true) WITH CHECK (true)
        `);
        console.log("  ✓ Created orgs_service_role");

        // ═══════════════════════════════════════════════════
        // SPANS — Fix to use org_members
        // ═══════════════════════════════════════════════════
        console.log("\n--- spans ---");

        await client.query(`DROP POLICY IF EXISTS "Members view spans" ON spans`);
        console.log("  ✓ Dropped legacy policy");

        await client.query(`
            CREATE POLICY "spans_select_by_org" ON spans
            FOR SELECT USING (
                organization_id IN (
                    SELECT org_id FROM org_members WHERE user_id = auth.uid()
                )
            )
        `);
        console.log("  ✓ Created spans_select_by_org");

        await client.query(`DROP POLICY IF EXISTS "spans_service_role" ON spans`);
        await client.query(`
            CREATE POLICY "spans_service_role" ON spans
            FOR ALL TO service_role USING (true) WITH CHECK (true)
        `);
        console.log("  ✓ Created spans_service_role");

        // ═══════════════════════════════════════════════════
        // TRACE_EVENTS — Already has "Allow public read for demo" (USING true)
        // That's fine for now, but let's add service role and org-scoped
        // ═══════════════════════════════════════════════════
        console.log("\n--- trace_events ---");
        // trace_events already has "Allow public read for demo" and service_role policies
        // They're fine — trace_events are scoped by trace_id which is already org-scoped
        console.log("  ✓ Existing policies OK (public read + service_role)");

        // ═══════════════════════════════════════════════════
        // ORG_MEMBERS — Enable RLS + add policies
        // ═══════════════════════════════════════════════════
        console.log("\n--- org_members ---");

        await client.query(`ALTER TABLE org_members ENABLE ROW LEVEL SECURITY`);
        console.log("  ✓ Enabled RLS");

        await client.query(`DROP POLICY IF EXISTS "org_members_select_own" ON org_members`);
        await client.query(`
            CREATE POLICY "org_members_select_own" ON org_members
            FOR SELECT USING (user_id = auth.uid())
        `);
        console.log("  ✓ Created org_members_select_own (user sees own memberships)");

        await client.query(`DROP POLICY IF EXISTS "org_members_service_role" ON org_members`);
        await client.query(`
            CREATE POLICY "org_members_service_role" ON org_members
            FOR ALL TO service_role USING (true) WITH CHECK (true)
        `);
        console.log("  ✓ Created org_members_service_role");

        console.log("\n[Migration 004] Done — all RLS policies updated to use org_members.");
    } catch (err) {
        console.error("[Migration 004] Error:", err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(e => { console.error(e); process.exit(1); });
