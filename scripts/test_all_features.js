/**
 * End-to-end feature test — exercises EVERY trace feature via API.
 * Tests: trace load, events, source code, forking, branches, replay.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BASE = 'http://localhost:3000';
const EMAIL = 'tracetest_1771520909072@test.dev';
const PASS = 'TraceTest!2026_5524996f';
const TRACE_ID = '9a860aff-67fc-4355-aa5c-b22d3d4b34b7';

let token = '';
let passed = 0;
let failed = 0;

async function check(name, fn) {
    try {
        const result = await fn();
        if (result.ok) {
            console.log(`  ✅ ${name}: ${result.detail || 'OK'}`);
            passed++;
        } else {
            console.log(`  ❌ ${name}: ${result.detail}`);
            failed++;
        }
    } catch (e) {
        console.log(`  💥 ${name}: CRASH — ${e.message}`);
        failed++;
    }
}

async function apiGet(path) {
    return fetch(`${BASE}${path}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
}

async function apiPost(path, body) {
    return fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
}

async function run() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  E2E Feature Test — All Trace Features       ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // Login
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
    token = data.session.access_token;
    console.log('🔑 Logged in, testing trace:', TRACE_ID, '\n');

    // ═══════════════════════════════════════════
    console.log('── 1. TRACE LOADING ──');
    // ═══════════════════════════════════════════

    await check('GET /api/trace/[id]', async () => {
        const res = await apiGet(`/api/trace/${TRACE_ID}`);
        const body = await res.json();
        if (res.status !== 200) return { ok: false, detail: `HTTP ${res.status}: ${JSON.stringify(body)}` };
        if (!body.trace?.id) return { ok: false, detail: 'No trace.id in response' };
        if (!body.metadata) return { ok: false, detail: 'No metadata in response' };
        return { ok: true, detail: `title="${body.trace.title}", status=${body.trace.status}` };
    });

    await check('GET /api/trace/events', async () => {
        const res = await apiGet(`/api/trace/events?traceId=${TRACE_ID}`);
        const body = await res.json();
        if (res.status !== 200) return { ok: false, detail: `HTTP ${res.status}: ${JSON.stringify(body)}` };
        if (!body.events || body.events.length === 0) return { ok: false, detail: 'No events returned' };
        const types = body.events.map(e => e.type);
        return { ok: true, detail: `${body.events.length} events [${types.join(', ')}], source=${body.source}` };
    });

    // ═══════════════════════════════════════════
    console.log('\n── 2. SOURCE CODE ──');
    // ═══════════════════════════════════════════

    await check('GET /api/trace/script', async () => {
        const res = await apiGet(`/api/trace/script?traceId=${TRACE_ID}`);
        const body = await res.json();
        if (res.status === 404) {
            return { ok: true, detail: 'Expected 404 — API traces have no source code (correct behavior)' };
        }
        if (res.status === 200 && body.script) {
            return { ok: true, detail: `Script found (${body.script.length} chars), source=${body.source}` };
        }
        return { ok: false, detail: `Unexpected: HTTP ${res.status}: ${JSON.stringify(body)}` };
    });

    // ═══════════════════════════════════════════
    console.log('\n── 3. FORKING (CREATE BRANCH) ──');
    // ═══════════════════════════════════════════

    let branchId = null;

    await check('POST /api/branches (create fork at step 2)', async () => {
        const res = await apiPost('/api/branches', {
            traceId: TRACE_ID,
            forkStep: 2,
            name: 'e2e-test-fork',
            overridePayload: { model: 'gpt-4o-mini', tokens: { prompt: 500, completion: 200 } },
        });
        const body = await res.json();
        if (res.status !== 200) return { ok: false, detail: `HTTP ${res.status}: ${JSON.stringify(body)}` };
        if (!body.branchId) return { ok: false, detail: 'No branchId in response: ' + JSON.stringify(body) };
        branchId = body.branchId;
        return { ok: true, detail: `branchId=${branchId}` };
    });

    // ═══════════════════════════════════════════
    console.log('\n── 4. LIST BRANCHES ──');
    // ═══════════════════════════════════════════

    await check('GET /api/branches', async () => {
        const res = await apiGet(`/api/branches?traceId=${TRACE_ID}`);
        const body = await res.json();
        if (res.status !== 200) return { ok: false, detail: `HTTP ${res.status}: ${JSON.stringify(body)}` };
        if (!body.branches || body.branches.length === 0) return { ok: false, detail: 'No branches found' };
        const names = body.branches.map(b => b.name || b.id.slice(0, 8));
        return { ok: true, detail: `${body.branches.length} branches: [${names.join(', ')}]` };
    });

    // ═══════════════════════════════════════════
    console.log('\n── 5. REPLAY (MULTIVERSE DIFF) ──');
    // ═══════════════════════════════════════════

    await check('POST /api/replay (branch replay)', async () => {
        if (!branchId) return { ok: false, detail: 'No branchId — fork failed, skipping' };
        const res = await apiPost('/api/replay', {
            traceId: TRACE_ID,
            branch: branchId,
        });
        const body = await res.json();
        if (res.status !== 200) return { ok: false, detail: `HTTP ${res.status}: ${JSON.stringify(body)}` };
        if (!body.success) return { ok: false, detail: `Replay failed: ${body.error || body.details}` };
        return { ok: true, detail: `${body.events?.length || 0} events, parentHash=${body.parentHash?.slice(0, 12) || 'none'}` };
    });

    // ═══════════════════════════════════════════
    console.log('\n── 6. RAW JSON (direct events check) ──');
    // ═══════════════════════════════════════════

    await check('Events have correct shape for TraceEventRow', async () => {
        const res = await apiGet(`/api/trace/events?traceId=${TRACE_ID}`);
        const body = await res.json();
        const ev = body.events[0];
        const hasSeq = 'seq' in ev;
        const hasType = 'type' in ev;
        const hasPayload = 'payload' in ev;
        if (!hasSeq || !hasType || !hasPayload) {
            return { ok: false, detail: `Missing fields: seq=${hasSeq}, type=${hasType}, payload=${hasPayload}. Keys: ${Object.keys(ev)}` };
        }
        return { ok: true, detail: `shape OK — seq=${ev.seq}, type=${ev.type}, payload_keys=${Object.keys(ev.payload || {})}` };
    });

    // ═══════════════════════════════════════════
    console.log('\n══════════════════════════════════════════');
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        console.log('⚠️  Some features are broken — see ❌ above');
        process.exit(1);
    } else {
        console.log('🎉 All features working!');
    }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
