const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function test() {
    const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Login
    const { data } = await sb.auth.signInWithPassword({
        email: 'tracetest_1771520909072@test.dev',
        password: 'TraceTest!2026_5524996f'
    });
    const token = data.session.access_token;
    console.log('✅ Logged in, token length:', token.length);

    // Test /api/trace/[id]
    console.log('\n=== /api/trace/[id] ===');
    const r1 = await fetch(`http://localhost:3000/api/trace/9a860aff-67fc-4355-aa5c-b22d3d4b34b7`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', r1.status);
    const j1 = await r1.json();
    if (r1.ok) {
        console.log('Trace ID:', j1.trace?.id);
        console.log('Trace title:', j1.trace?.title);
        console.log('Trace name:', j1.trace?.name);
        console.log('Trace status:', j1.trace?.status);
        console.log('Trace keys:', Object.keys(j1.trace || {}));
        console.log('Metadata:', JSON.stringify(j1.metadata));
    } else {
        console.log('ERROR:', JSON.stringify(j1));
    }

    // Test /api/trace/events
    console.log('\n=== /api/trace/events ===');
    const r2 = await fetch(`http://localhost:3000/api/trace/events?traceId=9a860aff-67fc-4355-aa5c-b22d3d4b34b7`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', r2.status);
    const j2 = await r2.json();
    if (r2.ok) {
        console.log('Events count:', j2.events?.length);
        console.log('Source:', j2.source);
        if (j2.events?.length > 0) {
            j2.events.forEach((e, i) => {
                console.log(`  Event ${i}: type=${e.type}, seq=${e.seq}`);
            });
        }
    } else {
        console.log('ERROR:', JSON.stringify(j2));
    }

    // Also check direct DB to confirm data exists
    console.log('\n=== Direct DB Check (service role) ===');
    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
    );

    const { data: dbTrace, error: traceErr } = await admin
        .from('traces')
        .select('*')
        .eq('id', '9a860aff-67fc-4355-aa5c-b22d3d4b34b7')
        .single();
    console.log('DB Trace:', dbTrace ? `found, title="${dbTrace.title}", name="${dbTrace.name}"` : 'NOT FOUND', traceErr?.message || '');
    if (dbTrace) {
        console.log('DB Trace columns:', Object.keys(dbTrace));
    }

    const { data: dbEvents, error: evErr } = await admin
        .from('trace_events')
        .select('*')
        .eq('trace_id', '9a860aff-67fc-4355-aa5c-b22d3d4b34b7')
        .order('seq', { ascending: true });
    console.log('DB Events:', dbEvents?.length || 0, 'rows', evErr?.message || '');
    if (dbEvents?.length > 0) {
        dbEvents.forEach((e, i) => {
            console.log(`  Row ${i}: seq=${e.seq}, type=${e.type}, payload_keys=${Object.keys(e.payload || {})}`);
        });
    }
}

test().catch(e => console.error('FATAL:', e));
