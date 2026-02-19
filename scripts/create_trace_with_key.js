const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'at_live_6d1a78b27b349019e21a945e80cab90f3ac26c46f09b760b';

async function run() {
    console.log('=== Creating Trace with Custom API Key ===\n');

    const traceId = crypto.randomUUID();
    const now = Date.now();

    const tracePayload = {
        trace_id: traceId,
        metadata: {
            title: 'Multiverse Live Verification',
            description: 'Trace created via API key for real-time verification of field normalization.',
            status: 'completed',
            step_count: 3,
            tags: ['api-key-test', 'live-verification'],
            root_hash: crypto.createHash('sha256').update(traceId).digest('hex'),
        },
        events: [
            {
                seq: 0, type: 'agent_start', timestamp: new Date(now).toISOString(),
                payload: { task: 'Verify field normalization', model: 'gpt-4o' }
            },
            {
                seq: 1, type: 'thought', timestamp: new Date(now + 1000).toISOString(),
                payload: { content: 'Fixing the divergent event payload normalization layer...' }
            },
            {
                seq: 2, type: 'agent_complete', timestamp: new Date(now + 2000).toISOString(),
                payload: { status: 'success', verified: true }
            },
        ],
        source_code: '# Verification Script\nprint("Normalization check active")',
    };

    console.log('Uploading trace:', traceId);

    try {
        const res = await fetch(`${BASE_URL}/api/trace/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY
            },
            body: JSON.stringify(tracePayload),
        });

        const body = await res.json();

        if (res.status !== 200 || !body.success) {
            console.error('❌ Trace upload failed Status:', res.status);
            console.error('Body:', JSON.stringify(body, null, 2));
            process.exit(1);
        }

        console.log('✅ Trace uploaded successfully!');
        console.log('🔗 View URL: ' + BASE_URL + '/dashboard/traces/' + traceId);
    } catch (err) {
        console.error('❌ Fetch error:', err.message);
        process.exit(1);
    }
}

run();
