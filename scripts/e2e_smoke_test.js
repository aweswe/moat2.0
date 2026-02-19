/**
 * Full E2E Smoke Test — Fresh User Flow
 * 
 * Phase 1: Create user via Supabase admin
 * Phase 2: Login in browser uses this user  
 * Phase 3: Generate API key + upload trace
 * Phase 4: Verify all features
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

const TEST_EMAIL = 'smoketest_' + Date.now() + '@test.dev';
const TEST_PASSWORD = 'SmokeTest!2026_' + crypto.randomBytes(4).toString('hex');

async function run() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     FULL E2E SMOKE TEST                  ║');
    console.log('╚══════════════════════════════════════════╝\n');

    // ═══ PHASE 1: Create new user ═══════════════════════
    console.log('=== PHASE 1: Create New User ===');
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,  // Skip email verification
        user_metadata: { full_name: 'Smoke Test User' },
    });

    if (createErr) {
        console.error('❌ Failed to create user:', createErr.message);
        process.exit(1);
    }

    console.log('✅ Created user:', newUser.user.id);
    console.log('   Email:', TEST_EMAIL);
    console.log('   Password:', TEST_PASSWORD);

    // ═══ PHASE 1b: Sign in to get token ═══════════════
    console.log('\n--- Signing in to get JWT ---');
    const { data: session, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    });

    if (signInErr) {
        console.error('❌ Sign-in failed:', signInErr.message);
        process.exit(1);
    }

    const jwt = session.session.access_token;
    console.log('✅ Got JWT token (first 30 chars):', jwt.substring(0, 30) + '...');

    // ═══ PHASE 1c: Call /api/auth/setup ═══════════════
    console.log('\n--- Calling /api/auth/setup ---');
    const setupRes = await fetch('http://localhost:3000/api/auth/setup', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + jwt },
    });
    const setupBody = await setupRes.json();
    console.log('Status:', setupRes.status);
    console.log('Body:', JSON.stringify(setupBody, null, 2));

    if (setupRes.status !== 200 || !setupBody.membership?.org_id) {
        console.error('❌ Auth setup failed');
        process.exit(1);
    }

    const orgId = setupBody.membership.org_id;
    const role = setupBody.membership.role;
    console.log('✅ Org created:', orgId);
    console.log('   Role:', role);
    console.log('   Status:', setupBody.status);

    // ═══ PHASE 2: Generate API Key ═══════════════════
    console.log('\n=== PHASE 2: Generate API Key ===');
    const keyRes = await fetch('http://localhost:3000/api/settings/keys', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + jwt,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'E2E Test Key' }),
    });
    const keyBody = await keyRes.json();
    console.log('Status:', keyRes.status);

    if (keyRes.status !== 200 || !keyBody.secret) {
        console.error('❌ Key creation failed:', JSON.stringify(keyBody));
        process.exit(1);
    }

    const apiKey = keyBody.secret;
    console.log('✅ API Key generated:', apiKey.substring(0, 16) + '...');
    console.log('   Key name:', keyBody.key?.name);
    console.log('   Scopes:', keyBody.key?.scopes);

    // ═══ PHASE 2b: Validate key via /api/auth/session ═══
    console.log('\n--- Validating key via /api/auth/session ---');
    const sessionRes = await fetch('http://localhost:3000/api/auth/session', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey },
    });
    const sessionBody = await sessionRes.json();
    console.log('Status:', sessionRes.status);
    console.log('Body:', JSON.stringify(sessionBody, null, 2));

    if (sessionRes.status !== 200 || sessionBody.org_id !== orgId) {
        console.error('❌ Session validation failed or org mismatch');
        process.exit(1);
    }
    console.log('✅ SDK init validated — org_id matches');

    // ═══ PHASE 3: Upload Trace ═══════════════════════
    console.log('\n=== PHASE 3: Upload Trace ===');
    const traceId = crypto.randomUUID();
    const now = Date.now();

    const tracePayload = {
        trace_id: traceId,
        metadata: {
            title: 'E2E Smoke Test Agent',
            description: 'Full pipeline verification trace',
            status: 'completed',
            step_count: 4,
            tags: ['smoke-test', 'e2e'],
            root_hash: crypto.createHash('sha256').update(traceId).digest('hex'),
        },
        spans: [
            {
                span_id: crypto.randomUUID(),
                name: 'agent.run',
                kind: 'server',
                start_time: new Date(now).toISOString(),
                end_time: new Date(now + 3000).toISOString(),
                attributes: { agent: 'SmokeTestAgent', model: 'gpt-4o' },
            },
            {
                span_id: crypto.randomUUID(),
                name: 'llm.completion',
                kind: 'client',
                start_time: new Date(now + 500).toISOString(),
                end_time: new Date(now + 1500).toISOString(),
                attributes: { model: 'gpt-4o', tokens: 1247 },
            },
            {
                span_id: crypto.randomUUID(),
                name: 'tool.search',
                kind: 'internal',
                start_time: new Date(now + 1500).toISOString(),
                end_time: new Date(now + 2500).toISOString(),
                attributes: { tool: 'web_search', query: 'smoke test verification' },
            },
        ],
        events: [
            { seq: 0, type: 'agent_start', timestamp: new Date(now).toISOString(), payload: { task: 'E2E verification', agent: 'SmokeTestAgent', model: 'gpt-4o' } },
            { seq: 1, type: 'llm_call', timestamp: new Date(now + 500).toISOString(), payload: { model: 'gpt-4o', tokens: { prompt: 800, completion: 447 }, prompt_preview: 'Verify all systems operational...' } },
            { seq: 2, type: 'tool_call', timestamp: new Date(now + 1500).toISOString(), payload: { tool: 'web_search', input: 'system health check', result: 'All systems nominal' } },
            { seq: 3, type: 'agent_complete', timestamp: new Date(now + 3000).toISOString(), payload: { status: 'success', cost_usd: 0.0089, total_tokens: 1247, output_preview: 'All systems verified operational' } },
        ],
    };

    const traceRes = await fetch('http://localhost:3000/api/trace/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify(tracePayload),
    });
    const traceBody = await traceRes.json();
    console.log('Status:', traceRes.status);
    console.log('Body:', JSON.stringify(traceBody, null, 2));

    if (traceRes.status !== 200 || !traceBody.success) {
        console.error('❌ Trace upload failed');
        process.exit(1);
    }

    console.log('✅ Trace uploaded:', traceId);
    console.log('   Spans:', traceBody.spans_count);
    console.log('   Events:', traceBody.events_count);

    // ═══ OUTPUT FOR BROWSER TESTING ════════════════════
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║     BROWSER TEST CREDENTIALS             ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('EMAIL:', TEST_EMAIL);
    console.log('PASSWORD:', TEST_PASSWORD);
    console.log('TRACE_ID:', traceId);
    console.log('ORG_ID:', orgId);
    console.log('API_KEY:', apiKey);
    console.log('\nUse these to login in browser and verify the trace.');
}

run().catch(e => { console.error('❌ Fatal error:', e); process.exit(1); });
