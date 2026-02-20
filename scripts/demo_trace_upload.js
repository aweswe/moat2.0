/**
 * AgentTrace — YC Demo Trace Upload
 *
 * Uploads a realistic "Stripe checkout agent" failure trace into YOUR account.
 * Run this while screen recording, then navigate to the printed URL live.
 *
 * Usage:
 *   AGENTTRACE_API_KEY=at_live_xxx node scripts/demo_trace_upload.js
 *
 * Or edit API_KEY below if you prefer not to use an env var.
 */

const API_KEY = process.env.AGENTTRACE_API_KEY || 'PASTE_YOUR_API_KEY_HERE';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ─────────────────────────────────────────────────────────────────
// Build the demo trace
// ─────────────────────────────────────────────────────────────────
const traceId = uuid();
const base = new Date('2026-02-20T00:07:00+05:30').getTime(); // feels like "last night"

const events = [
    {
        seq: 0,
        type: 'agent_start',
        timestamp: new Date(base).toISOString(),
        payload: {
            task: 'Process checkout for order #8821',
            agent: 'CheckoutAgent',
            model: 'gpt-4o',
            framework: 'custom',
            input: { order_id: 'ORD-8821', amount_cents: 24900, currency: 'usd' },
        },
    },
    {
        seq: 1,
        type: 'planning',
        timestamp: new Date(base + 300).toISOString(),
        payload: {
            strategy: 'sequential_checkout',
            steps: ['validate_order', 'resolve_payment_method', 'charge_stripe', 'send_confirmation'],
        },
    },
    {
        seq: 2,
        type: 'tool_call',
        timestamp: new Date(base + 700).toISOString(),
        payload: {
            tool: 'validate_order',
            input: 'ORD-8821',
            result: { valid: true, items: 3, total_cents: 24900, customer_id: 'cus_xyz123' },
        },
    },
    {
        seq: 3,
        type: 'tool_call',
        timestamp: new Date(base + 1200).toISOString(),
        payload: {
            tool: 'resolve_payment_method',
            input: 'cus_xyz123',
            result: { method: 'pm_card_visa', last4: '4242', ready: true },
        },
    },
    {
        seq: 4,
        type: 'llm_call',
        timestamp: new Date(base + 1800).toISOString(),
        payload: {
            model: 'gpt-4o',
            prompt_preview: 'Order validated. Payment method resolved. Generate Stripe charge call.',
            tokens: { prompt: 412, completion: 88 },
            response_preview: 'Call stripe.charges.create with amount=24900, currency=usd, customer=cus_xyz123',
        },
    },
    {
        seq: 5,
        type: 'tool_call',
        timestamp: new Date(base + 2400).toISOString(),
        payload: {
            tool: 'stripe_charge',
            input: { amount: 24900, currency: 'usd', customer: 'cus_xyz123', idempotency_key: null },
            status: 'pending',
            note: 'Charge initiated — awaiting Stripe response',
        },
    },
    {
        seq: 6,
        type: 'error',
        timestamp: new Date(base + 32400).toISOString(), // 30 second timeout
        payload: {
            error_type: 'ReadTimeout',
            message: 'Stripe API connection timed out after 30000ms',
            tool: 'stripe_charge',
            retryable: true,
            // ← THIS IS THE FORK POINT — "What if we had an idempotency key here?"
            agent_decision: 'Retrying charge (no idempotency key set)',
        },
    },
    {
        seq: 7,
        type: 'tool_call',
        timestamp: new Date(base + 33000).toISOString(),
        payload: {
            tool: 'stripe_charge',
            input: { amount: 24900, currency: 'usd', customer: 'cus_xyz123', idempotency_key: null },
            status: 'success',
            result: { charge_id: 'ch_retry_001', amount: 24900, status: 'succeeded' },
        },
    },
    {
        seq: 8,
        type: 'observation',
        timestamp: new Date(base + 33500).toISOString(),
        payload: {
            note: 'Retry succeeded. Charge confirmed.',
            charge_id: 'ch_retry_001',
        },
    },
    {
        seq: 9,
        type: 'tool_call',
        timestamp: new Date(base + 34000).toISOString(),
        payload: {
            tool: 'send_confirmation_email',
            input: { customer_id: 'cus_xyz123', order_id: 'ORD-8821', charge_id: 'ch_retry_001' },
            result: { sent: true, email: 'user@example.com' },
        },
    },
    {
        seq: 10,
        type: 'agent_complete',
        timestamp: new Date(base + 35000).toISOString(),
        payload: {
            status: 'completed',
            cost_usd: 0.0021,
            total_tokens: 500,
            output_preview: 'Checkout complete. Confirmation sent.',
            hidden_issue: 'Original charge ch_original_001 also succeeded — customer charged twice ($498)',
        },
    },
    {
        seq: 11,
        type: 'observation',
        timestamp: new Date(base + 36000).toISOString(),
        payload: {
            note: '⚠️ SUPPORT TICKET: customer@example.com reports duplicate charge. $498 total debited.',
            severity: 'critical',
            stripe_charges: ['ch_original_001 — $249 ✓', 'ch_retry_001 — $249 ✓'],
            root_cause: 'No idempotency key on retry. Both charges succeeded.',
        },
    },
];

const spans = [
    {
        span_id: uuid(),
        name: 'agent.checkout_run',
        kind: 'server',
        start_time: new Date(base).toISOString(),
        end_time: new Date(base + 36000).toISOString(),
        attributes: {
            agent: 'CheckoutAgent',
            model: 'gpt-4o',
            order_id: 'ORD-8821',
            outcome: 'double_charge_bug',
        },
    },
];

const source_code = [
    '# CheckoutAgent — AgentTrace YC Demo',
    '# This run demonstrates the double-charge bug (no idempotency key on retry)',
    '',
    'import agenttrace',
    'from stripe_client import charge_customer',
    '',
    '@agenttrace.trace("checkout_agent")',
    'async def run_checkout(order_id: str):',
    '    order = await validate_order(order_id)',
    '    pm = await resolve_payment_method(order.customer_id)',
    '',
    '    # ← FORK POINT: no idempotency_key here means retry = duplicate charge',
    '    try:',
    '        charge = await stripe.charges.create(',
    '            amount=order.amount_cents,',
    '            currency="usd",',
    '            customer=order.customer_id,',
    '            # idempotency_key=None  ← the bug',
    '        )',
    '    except ReadTimeout:',
    '        # Agent retries unguarded — Stripe processes BOTH charges',
    '        charge = await stripe.charges.create(',
    '            amount=order.amount_cents,',
    '            currency="usd",',
    '            customer=order.customer_id,',
    '        )',
    '',
    '    await send_confirmation(order.customer_id, charge.id)',
].join('\n');

// ─────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────
async function upload() {
    if (API_KEY === 'PASTE_YOUR_API_KEY_HERE') {
        console.error('\n❌  Set your API key first:');
        console.error('    AGENTTRACE_API_KEY=at_live_xxx node scripts/demo_trace_upload.js\n');
        process.exit(1);
    }

    console.log('\n🎬  AgentTrace — YC Demo Trace Upload');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Scenario: CheckoutAgent double-charges customer');
    console.log('   Events  : ' + events.length);
    console.log('   Uploading...\n');

    const res = await fetch(`${BASE_URL}/api/trace/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            trace_id: traceId,
            metadata: {
                title: 'CheckoutAgent — Double Charge Bug',
                description: 'Agent retried Stripe charge without idempotency key. Customer charged $498 instead of $249.',
                status: 'completed',
                step_count: events.length,
                tags: ['checkout', 'stripe', 'bug', 'yc-demo'],
                root_hash: traceId.replace(/-/g, ''),
            },
            spans,
            events,
            source_code,
        }),
    });

    const body = await res.json();

    if (!res.ok || !body.success) {
        console.error('❌  Upload failed:', JSON.stringify(body, null, 2));
        process.exit(1);
    }

    console.log('✅  Trace uploaded successfully');
    console.log('   Events stored :', body.events_count);
    console.log('   Spans stored  :', body.spans_count);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗  OPEN THIS URL ON CAMERA:');
    console.log('');
    console.log(`    ${BASE_URL}/dashboard/traces/${traceId}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯  FORK POINT: hover event #6 (seq: 6 — ReadTimeout)');
    console.log('    "What if we had set an idempotency_key before retrying?"');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

upload().catch(e => {
    console.error('\n❌  Fatal error:', e.message);
    process.exit(1);
});
