require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

async function run() {
    const client = await pool.connect();
    try {
        console.log("[Migration 003] Adding safety constraints...");

        // 1. Unique constraint: one membership per (user_id, org_id)
        //    Prevents duplicate memberships from race conditions
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_org 
            ON org_members(user_id, org_id);
        `);
        console.log("  ✓ UNIQUE(user_id, org_id) on org_members");

        // 2. Unique constraint on invites token_hash
        //    Prevents token collision (astronomically unlikely but defense-in-depth)
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_token_hash 
            ON invites(token_hash);
        `);
        console.log("  ✓ UNIQUE(token_hash) on invites");

        // 3. Index on invites email + status for fast pending lookup
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_invites_email_status 
            ON invites(lower(email), status);
        `);
        console.log("  ✓ INDEX(lower(email), status) on invites");

        // 4. Ensure invite emails are stored lowercase via a trigger
        await client.query(`
            CREATE OR REPLACE FUNCTION normalize_invite_email()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.email = lower(NEW.email);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        await client.query(`
            DROP TRIGGER IF EXISTS trg_normalize_invite_email ON invites;
            CREATE TRIGGER trg_normalize_invite_email
            BEFORE INSERT OR UPDATE ON invites
            FOR EACH ROW
            EXECUTE FUNCTION normalize_invite_email();
        `);
        console.log("  ✓ Trigger: auto-lowercase invite emails");

        console.log("[Migration 003] Done — all constraints applied.");
    } catch (err) {
        console.error("[Migration 003] Error:", err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(e => { console.error(e); process.exit(1); });
