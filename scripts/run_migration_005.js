/**
 * Migration 005 — Schema Hardening
 *
 * 1. Add `scopes` column to api_keys (default: all scopes)
 * 2. Add `root_hash` column to traces
 * 3. Create index on api_keys(key_hash) for fast lookups
 * 4. Create index on traces(org_id) for org-scoped queries
 * 5. Create index on trace_events(trace_id) for event lookups
 */

require('dotenv').config();
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.POSTGRES_URL });
    await client.connect();

    console.log('[Migration 005] Schema hardening...\n');

    // ─── 1. api_keys.scopes ────────────────────────────
    try {
        await client.query(`
            ALTER TABLE api_keys
            ADD COLUMN IF NOT EXISTS scopes text[] DEFAULT ARRAY['ingest','replay','read']
        `);
        console.log('  ✓ Added api_keys.scopes column (default: ingest, replay, read)');
    } catch (e) {
        console.log('  ⚠ api_keys.scopes:', e.message);
    }

    // ─── 2. traces.root_hash ───────────────────────────
    try {
        await client.query(`
            ALTER TABLE traces
            ADD COLUMN IF NOT EXISTS root_hash text
        `);
        console.log('  ✓ Added traces.root_hash column');
    } catch (e) {
        console.log('  ⚠ traces.root_hash:', e.message);
    }

    // ─── 3. Index: api_keys(key_hash) ──────────────────
    try {
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
            ON api_keys (key_hash)
        `);
        console.log('  ✓ Created index idx_api_keys_key_hash');
    } catch (e) {
        console.log('  ⚠ idx_api_keys_key_hash:', e.message);
    }

    // ─── 4. Index: traces(org_id) ──────────────────────
    try {
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_traces_org_id
            ON traces (org_id)
        `);
        console.log('  ✓ Created index idx_traces_org_id');
    } catch (e) {
        console.log('  ⚠ idx_traces_org_id:', e.message);
    }

    // ─── 5. Index: trace_events(trace_id, seq) ─────────
    try {
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_trace_events_trace_id_seq
            ON trace_events (trace_id, seq)
        `);
        console.log('  ✓ Created index idx_trace_events_trace_id_seq');
    } catch (e) {
        console.log('  ⚠ idx_trace_events_trace_id_seq:', e.message);
    }

    // ─── 6. Index: spans(trace_id) ─────────────────────
    try {
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_spans_trace_id
            ON spans (trace_id)
        `);
        console.log('  ✓ Created index idx_spans_trace_id');
    } catch (e) {
        console.log('  ⚠ idx_spans_trace_id:', e.message);
    }

    // ─── 7. Index: org_members(user_id) ────────────────
    try {
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_org_members_user_id
            ON org_members (user_id)
        `);
        console.log('  ✓ Created index idx_org_members_user_id');
    } catch (e) {
        console.log('  ⚠ idx_org_members_user_id:', e.message);
    }

    console.log('\n[Migration 005] Done — schema hardened.');
    await client.end();
}

run().catch(e => { console.error('Migration 005 failed:', e); process.exit(1); });
