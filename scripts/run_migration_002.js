require('dotenv').config();
const pg = require('pg');
const fs = require('fs');

const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

async function run() {
    try {
        // Step 1: Create tables (DDL)
        console.log('Step 1: Creating org_members table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS org_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','dev','viewer')),
                display_name TEXT,
                created_at TIMESTAMPTZ DEFAULT now(),
                UNIQUE(org_id, user_id)
            )
        `);
        console.log('  OK');

        console.log('Step 2: Creating invites table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invites (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                email TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('dev','viewer')),
                token_hash TEXT NOT NULL,
                invited_by UUID REFERENCES auth.users(id),
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
                created_at TIMESTAMPTZ DEFAULT now(),
                expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
                used_at TIMESTAMPTZ,
                UNIQUE(org_id, email)
            )
        `);
        console.log('  OK');

        console.log('Step 3: Creating indexes...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token_hash)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email)');
        console.log('  OK');

        console.log('Step 4: Migrating profiles -> org_members...');
        const result = await pool.query(`
            INSERT INTO org_members (org_id, user_id, role, display_name, created_at)
            SELECT organization_id, user_id,
                   CASE WHEN role IN ('owner','dev','viewer') THEN role ELSE 'viewer' END,
                   display_name, created_at
            FROM profiles
            WHERE organization_id IS NOT NULL
            ON CONFLICT (org_id, user_id) DO NOTHING
        `);
        console.log('  Migrated rows:', result.rowCount);

        // Verify
        const { rows: memberRows } = await pool.query('SELECT count(*) FROM org_members');
        const { rows: inviteRows } = await pool.query('SELECT count(*) FROM invites');
        console.log('\nFinal state:');
        console.log('  org_members:', memberRows[0].count);
        console.log('  invites:', inviteRows[0].count);
        console.log('\nMigration COMPLETE');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
