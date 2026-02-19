require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL });

async function run() {
    const r = await pool.query(`
        SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE tablename IN ('traces','spans','trace_events','organizations','org_members')
        ORDER BY tablename, policyname
    `);

    console.log("=== All RLS Policies ===\n");
    r.rows.forEach(row => {
        console.log(`TABLE: ${row.tablename}`);
        console.log(`  Policy: ${row.policyname}`);
        console.log(`  Cmd: ${row.cmd}`);
        console.log(`  Roles: ${row.roles}`);
        console.log(`  USING: ${row.qual}`);
        console.log(`  WITH CHECK: ${row.with_check}`);
        console.log('');
    });

    await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
