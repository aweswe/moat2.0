import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * POST /api/trace/register
 *
 * Ingests a trace + optional spans + events.
 * Auth: API key ONLY via `Authorization: Bearer at_live_xxx`.
 * org_id is NEVER accepted from the client payload.
 *
 * Identity chain: API key → SHA256 hash → api_keys.key_hash → org_id
 */

// ─── API Key Resolution ──────────────────────────────
// Validates key, enforces revocation, derives org_id, checks scopes.
async function resolveApiKey(
    req: Request,
    requiredScope: string = 'ingest'
): Promise<{ org_id: string; key_id: string } | { error: string; status: number }> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Missing Authorization header. Use: Bearer at_live_xxx', status: 401 };
    }

    const token = authHeader.slice(7); // strip "Bearer "
    if (!token.startsWith('at_live_')) {
        return { error: 'Invalid API key format. Keys must start with at_live_', status: 401 };
    }

    const keyHash = createHash('sha256').update(token).digest('hex');

    const { data: key, error } = await supabaseAdmin
        .from('api_keys')
        .select('id, org_id, revoked_at, scopes')
        .eq('key_hash', keyHash)
        .single();

    if (error || !key) {
        console.warn('[API] API key lookup failed:', error?.message || 'Key not found');
        return { error: 'Invalid API key', status: 401 };
    }

    if (key.revoked_at) {
        console.warn(`[API] Rejected revoked key ${key.id}`);
        return { error: 'API key has been revoked', status: 401 };
    }

    // Scope enforcement
    const scopes: string[] = key.scopes || ['ingest', 'replay', 'read'];
    if (!scopes.includes(requiredScope)) {
        console.warn(`[API] Key ${key.id} missing scope '${requiredScope}'. Has: ${scopes}`);
        return { error: `API key does not have '${requiredScope}' scope`, status: 403 };
    }

    // Update last_used_at (fire-and-forget)
    supabaseAdmin
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', key.id)
        .then(() => { });

    return { org_id: key.org_id, key_id: key.id };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { trace_id, metadata } = body;

        if (!trace_id) {
            return NextResponse.json({ error: 'Missing trace_id' }, { status: 400 });
        }

        // ─── Auth: API key → org_id (SOLE source of identity) ─
        const authResult = await resolveApiKey(req, 'ingest');
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { org_id } = authResult;

        // ─── Build trace record ────────────────────────────
        const meta = metadata || {};
        const {
            timestamp,
            title,
            description,
            status,
            step_count,
            tags,
            root_hash,
        } = meta;

        const { data, error } = await supabaseAdmin
            .from('traces')
            .upsert({
                id: trace_id,
                org_id,
                title: title || `Trace ${trace_id.slice(0, 8)}`,
                description: description || null,
                created_at: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
                status: status || 'completed',
                step_count: step_count || 0,
                root_hash: root_hash || null,
                metadata: { ...meta, is_deterministic: true, tags: tags || [] },
            }, { onConflict: 'id' });

        if (error) {
            console.error('[API] Trace registration failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // ─── Insert spans if provided ──────────────────────
        const spans = body.spans;
        if (spans && Array.isArray(spans) && spans.length > 0) {
            const spanRecords = spans.map((s: any) => ({
                span_id: s.span_id,
                trace_id,
                organization_id: org_id,
                parent_span_id: s.parent_span_id || null,
                name: s.name,
                kind: s.kind || 'internal',
                start_time: s.start_time,
                end_time: s.end_time || null,
                attributes: s.attributes || {},
                metrics: s.metrics || {},
            }));

            const { error: spanError } = await supabaseAdmin
                .from('spans')
                .upsert(spanRecords, { onConflict: 'span_id' });

            if (spanError) {
                console.error('[API] Span insertion failed:', spanError);
            }
        }

        // ─── Insert events if provided ─────────────────────
        const events = body.events;
        if (events && Array.isArray(events) && events.length > 0) {
            const eventRecords = events.map((e: any, i: number) => ({
                trace_id,
                seq: e.seq ?? i,
                timestamp: e.timestamp || new Date().toISOString(),
                type: e.type || 'generic',
                payload: e.payload || {},
            }));

            const { error: eventError } = await supabaseAdmin
                .from('trace_events')
                .insert(eventRecords);

            if (eventError) {
                console.error('[API] Event insertion failed:', eventError);
            }
        }

        // ─── Upload source code if provided ────────────────
        const source_code = body.source_code;
        if (source_code && typeof source_code === 'string') {
            const { error: uploadError } = await supabaseAdmin.storage
                .from('traces')
                .upload(`${trace_id}/script.py`, source_code, {
                    contentType: 'text/plain',
                    upsert: true,
                });

            if (uploadError) {
                console.error('[API] Source code upload failed:', uploadError);
            }
        }

        console.log(`[API] Trace registered: ${trace_id} → org ${org_id} (${spans?.length || 0} spans, ${events?.length || 0} events${source_code ? ', +script' : ''})`);

        return NextResponse.json({
            success: true,
            id: trace_id,
            org_id,
            spans_count: spans?.length || 0,
            events_count: events?.length || 0,
        });

    } catch (error) {
        console.error('[API] Trace registration exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
