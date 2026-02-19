import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

// Helper: resolve caller identity + org membership
async function getCaller(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', '')
    );
    if (error || !user) return null;

    const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .single();

    if (!membership) return null;

    return { user, membership };
}

// GET: List API keys for org (never returns the actual key, only prefix + metadata)
export async function GET(req: NextRequest) {
    try {
        const caller = await getCaller(req);
        if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (caller.membership.role === 'viewer') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { data: keys, error } = await supabaseAdmin
            .from('api_keys')
            .select('id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at')
            .eq('org_id', caller.membership.org_id)
            .is('revoked_at', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("[API /settings/keys GET]", error);
            return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
        }

        return NextResponse.json({ keys: keys || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST: Generate a new API key
export async function POST(req: NextRequest) {
    try {
        const caller = await getCaller(req);
        if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (caller.membership.role !== 'owner') {
            return NextResponse.json({ error: "Only owners can create API keys" }, { status: 403 });
        }

        const body = await req.json();
        const keyName = body.name || 'Default Key';
        const scopes = body.scopes || ['ingest', 'replay', 'read'];

        // Generate key: at_live_ + 32 random hex chars
        const rawKey = `at_live_${randomBytes(24).toString('hex')}`;
        const keyHash = createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 12) + '...';

        const { data: newKey, error } = await supabaseAdmin
            .from('api_keys')
            .insert({
                org_id: caller.membership.org_id,
                name: keyName,
                key_hash: keyHash,
                key_prefix: keyPrefix,
                scopes,
            })
            .select('id, name, key_prefix, scopes, created_at')
            .single();

        if (error) {
            console.error("[API /settings/keys POST]", error);
            return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
        }

        console.log(`[API Keys] Created key "${keyName}" for org ${caller.membership.org_id}`);

        // Return the raw key ONLY on creation — it's never stored or shown again
        return NextResponse.json({
            key: newKey,
            secret: rawKey, // ⚠️ Only returned once — must be copied now
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE: Revoke an API key
export async function DELETE(req: NextRequest) {
    try {
        const caller = await getCaller(req);
        if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (caller.membership.role !== 'owner') {
            return NextResponse.json({ error: "Only owners can revoke API keys" }, { status: 403 });
        }

        const keyId = req.nextUrl.searchParams.get('keyId');
        if (!keyId) return NextResponse.json({ error: "keyId is required" }, { status: 400 });

        // Verify key belongs to org
        const { data: key } = await supabaseAdmin
            .from('api_keys')
            .select('id, org_id')
            .eq('id', keyId)
            .eq('org_id', caller.membership.org_id)
            .single();

        if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

        const { error } = await supabaseAdmin
            .from('api_keys')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', keyId);

        if (error) {
            console.error("[API /settings/keys DELETE]", error);
            return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
        }

        console.log(`[API Keys] Revoked key ${keyId} for org ${caller.membership.org_id}`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
