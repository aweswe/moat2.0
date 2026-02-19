/**
 * Create a fresh test trace via API to verify DB-first rendering.
 * 
 * This script:
 * 1. Signs in as an existing user (or creates one)
 * 2. Generates an API key
 * 3. Uploads a rich trace with spans + events
 * 4. Outputs the URL to view
 * 
 * Usage: node scripts/create_test_trace.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'tracetest_' + Date.now() + '@test.dev';
const TEST_PASSWORD = 'TraceTest!2026_' + crypto.randomBytes(4).toString('hex');

async function run() {
    console.log('=== Creating Fresh Test Trace ===\n');

    // 1. Create user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Trace Test User' },
    });
    if (createErr) { console.error('❌ User creation failed:', createErr.message); process.exit(1); }
    console.log('✅ User created:', TEST_EMAIL);

    // 2. Sign in
    const { data: session, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
        email: TEST_EMAIL, password: TEST_PASSWORD,
    });
    if (signInErr) { console.error('❌ Sign-in failed:', signInErr.message); process.exit(1); }
    const jwt = session.session.access_token;

    // 3. Setup org
    const setupRes = await fetch(`${BASE_URL}/api/auth/setup`, {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + jwt },
    });
    const setupBody = await setupRes.json();
    if (!setupBody.membership?.org_id) { console.error('❌ Auth setup failed:', JSON.stringify(setupBody)); process.exit(1); }
    console.log('✅ Org created:', setupBody.membership.org_id);

    // 4. Generate API key
    const keyRes = await fetch(`${BASE_URL}/api/settings/keys`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Trace Test Key' }),
    });
    const keyBody = await keyRes.json();
    if (!keyBody.secret) { console.error('❌ Key creation failed:', JSON.stringify(keyBody)); process.exit(1); }
    const apiKey = keyBody.secret;
    console.log('✅ API Key generated:', apiKey.substring(0, 16) + '...');

    // 5. Upload trace
    const traceId = crypto.randomUUID();
    const now = Date.now();

    const tracePayload = {
        trace_id: traceId,
        metadata: {
            title: 'DB-First Rendering Test',
            description: 'Verifying that traces ingested via API display correctly with DB-first hooks',
            status: 'completed',
            step_count: 6,
            tags: ['db-first-test', 'verification'],
            root_hash: crypto.createHash('sha256').update(traceId).digest('hex'),
        },
        spans: [
            {
                span_id: crypto.randomUUID(),
                name: 'agent.run',
                kind: 'server',
                start_time: new Date(now).toISOString(),
                end_time: new Date(now + 5000).toISOString(),
                attributes: { agent: 'VerificationAgent', model: 'gpt-4o' },
            },
        ],
        events: [
            {
                seq: 0, type: 'agent_start', timestamp: new Date(now).toISOString(),
                payload: { task: 'DB-First rendering verification', agent: 'VerificationAgent', model: 'gpt-4o', framework: 'AgentTrace v2' }
            },
            {
                seq: 1, type: 'planning', timestamp: new Date(now + 500).toISOString(),
                payload: { strategy: 'verify_all_panels', steps: ['Load trace from DB', 'Render header', 'Show events', 'Display metadata'] }
            },
            {
                seq: 2, type: 'llm_call', timestamp: new Date(now + 1000).toISOString(),
                payload: { model: 'gpt-4o', tokens: { prompt: 1500, completion: 800 }, prompt_preview: 'Verify all rendering panels work correctly...' }
            },
            {
                seq: 3, type: 'tool_call', timestamp: new Date(now + 2000).toISOString(),
                payload: { tool: 'browser_check', input: 'Check header, badges, timeline, inspector', result: { header: 'visible', badges: 'visible', timeline: '6 events', inspector: 'active' } }
            },
            {
                seq: 4, type: 'observation', timestamp: new Date(now + 3500).toISOString(),
                payload: { note: 'All panels rendering correctly with DB-first approach', confidence: 0.98 }
            },
            {
                seq: 5, type: 'agent_complete', timestamp: new Date(now + 5000).toISOString(),
                payload: { status: 'success', cost_usd: 0.0115, total_tokens: 2300, output_preview: 'All rendering panels verified working' }
            },
        ],
        source_code: [
            '#!/usr/bin/env python3',
            '"""AgentTrace Verification Agent — DB-First Rendering Test"""',
            'import asyncio',
            'from agenttrace import AgentTrace, trace',
            '',
            '@trace("verification_agent")',
            'async def run_verification():',
            '    """Verify all rendering panels display correctly."""',
            '    tracer = AgentTrace(model="gpt-4o")',
            '',
            '    # Step 1: Plan verification strategy',
            '    plan = tracer.plan(',
            '        strategy="verify_all_panels",',
            '        steps=["Load trace from DB", "Render header", "Show events", "Display metadata"]',
            '    )',
            '',
            '    # Step 2: Execute LLM call',
            '    result = await tracer.llm_call(',
            '        model="gpt-4o",',
            '        prompt="Verify all rendering panels work correctly...",',
            '        max_tokens=800',
            '    )',
            '',
            '    # Step 3: Run browser check tool',
            '    check = tracer.tool_call(',
            '        tool="browser_check",',
            '        input="Check header, badges, timeline, inspector",',
            '    )',
            '',
            '    # Step 4: Record observation',
            '    tracer.observe(',
            '        note="All panels rendering correctly with DB-first approach",',
            '        confidence=0.98',
            '    )',
            '',
            '    return {"status": "success", "cost_usd": 0.0115}',
            '',
            'if __name__ == "__main__":',
            '    asyncio.run(run_verification())',
        ].join('\n'),
    };

    const traceRes = await fetch(`${BASE_URL}/api/trace/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify(tracePayload),
    });
    const traceBody = await traceRes.json();

    if (traceRes.status !== 200 || !traceBody.success) {
        console.error('❌ Trace upload failed:', JSON.stringify(traceBody));
        process.exit(1);
    }

    console.log('✅ Trace uploaded:', traceId);
    console.log('   Events:', traceBody.events_count);
    console.log('   Spans:', traceBody.spans_count);

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║     TEST CREDENTIALS                     ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('EMAIL:', TEST_EMAIL);
    console.log('PASSWORD:', TEST_PASSWORD);
    console.log('TRACE_ID:', traceId);
    console.log(`\n🔗 View: ${BASE_URL}/dashboard/traces/${traceId}`);
    console.log('\nLogin with these credentials, then navigate to the trace URL above.');
}

run().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
