require('dotenv').config();
const crypto = require('crypto');

const API_KEY = 'at_live_d48159e0b1dfdba3cb1ea2a93674dadc96cd576d86b5f28b';
const BASE = 'http://localhost:3000';

async function run() {
    // Test 1: /api/auth/session — SDK init
    console.log('=== Test 1: /api/auth/session (SDK init) ===');
    const r1 = await fetch(BASE + '/api/auth/session', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + API_KEY },
    });
    console.log('Status:', r1.status);
    const b1 = await r1.json();
    console.log('Body:', JSON.stringify(b1, null, 2));

    // Test 2: trace register WITHOUT API key (must 401)
    console.log('\n=== Test 2: NO API key → must reject ===');
    const r2 = await fetch(BASE + '/api/trace/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trace_id: crypto.randomUUID(), metadata: { org_id: 'injected-fake-org' } }),
    });
    console.log('Status:', r2.status, r2.status === 401 ? '✅' : '❌');
    console.log('Body:', JSON.stringify(await r2.json()));

    // Test 3: trace register WITH valid key (no org_id in meta)
    console.log('\n=== Test 3: Valid key, identity from key ONLY ===');
    const traceId = crypto.randomUUID();
    const r3 = await fetch(BASE + '/api/trace/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API_KEY,
        },
        body: JSON.stringify({
            trace_id: traceId,
            metadata: {
                title: 'Identity Boundary Verified',
                status: 'completed',
                step_count: 2,
            },
            events: [
                { seq: 0, type: 'identity_check', timestamp: new Date().toISOString(), payload: { boundary: 'enforced', client_org_id: 'NOT_USED' } },
                { seq: 1, type: 'scope_verified', timestamp: new Date().toISOString(), payload: { scope: 'ingest', passed: true } },
            ],
        }),
    });
    console.log('Status:', r3.status, r3.status === 200 ? '✅' : '❌');
    const b3 = await r3.json();
    console.log('Body:', JSON.stringify(b3, null, 2));

    // Test 4: fake key (must 401)
    console.log('\n=== Test 4: Fake key → must reject ===');
    const r4 = await fetch(BASE + '/api/auth/session', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer at_live_totally_fake_not_real_xxxxxxxxxxxxxxxxx' },
    });
    console.log('Status:', r4.status, r4.status === 401 ? '✅' : '❌');
    console.log('Body:', JSON.stringify(await r4.json()));

    console.log('\n=== Summary ===');
    console.log('Test 1 (SDK init):', r1.status === 200 ? '✅ PASS' : '❌ FAIL (' + r1.status + ')');
    console.log('Test 2 (No key):', r2.status === 401 ? '✅ PASS' : '❌ FAIL');
    console.log('Test 3 (Trace ingest):', r3.status === 200 ? '✅ PASS' : '❌ FAIL (' + r3.status + ')');
    console.log('Test 4 (Fake key):', r4.status === 401 ? '✅ PASS' : '❌ FAIL');
}

run().catch(e => { console.error('Test error:', e); process.exit(1); });
