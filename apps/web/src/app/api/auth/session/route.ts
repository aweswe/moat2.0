import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * POST /api/auth/session
 *
 * SDK initialization endpoint.
 * Validates an API key and returns org configuration.
 *
 * This does NOT issue session tokens — the API key IS the credential
 * for all subsequent requests (Stripe model).
 *
 * Request:
 *   Authorization: Bearer at_live_xxx
 *
 * Response:
 *   { org_id, org_name, tier, scopes, rate_limits }
 */
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({
                error: 'Missing Authorization header. Use: Bearer at_live_xxx'
            }, { status: 401 });
        }

        const token = authHeader.slice(7);
        if (!token.startsWith('at_live_')) {
            return NextResponse.json({
                error: 'Invalid API key format. Keys must start with at_live_'
            }, { status: 401 });
        }

        const keyHash = createHash('sha256').update(token).digest('hex');

        // ─── Lookup key ────────────────────────────────────
        const { data: key, error: keyError } = await supabaseAdmin
            .from('api_keys')
            .select('id, org_id, name, revoked_at, scopes, created_at')
            .eq('key_hash', keyHash)
            .single();

        if (keyError || !key) {
            console.warn('[API /auth/session] Invalid API key attempt');
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        if (key.revoked_at) {
            console.warn(`[API /auth/session] Rejected revoked key: ${key.id}`);
            return NextResponse.json({ error: 'API key has been revoked' }, { status: 401 });
        }

        // ─── Fetch org info ────────────────────────────────
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, name, created_at')
            .eq('id', key.org_id)
            .single();

        if (orgError || !org) {
            console.error('[API /auth/session] Org not found for key:', key.id);
            return NextResponse.json({ error: 'Organization not found' }, { status: 500 });
        }

        // ─── Update last_used_at ───────────────────────────
        supabaseAdmin
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', key.id)
            .then(() => { });

        // ─── Return SDK configuration ──────────────────────
        const scopes: string[] = key.scopes || ['ingest', 'replay', 'read'];

        return NextResponse.json({
            org_id: org.id,
            org_name: org.name,
            key_name: key.name,
            scopes,
            tier: 'free',  // Future: derive from billing
            rate_limits: {
                traces_per_minute: 60,
                events_per_trace: 10000,
                max_payload_mb: 5,
            },
            feature_flags: {
                replay: true,
                branching: true,
                afe: false,  // Future phase
            },
        });

    } catch (error: any) {
        console.error('[API /auth/session] Error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
