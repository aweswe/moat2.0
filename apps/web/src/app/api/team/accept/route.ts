import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

// GET: Validate invite token (public — no auth required)
export async function GET(req: NextRequest) {
    try {
        const token = req.nextUrl.searchParams.get('token');
        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        const tokenHash = createHash('sha256').update(token).digest('hex');

        const { data: invite, error } = await supabaseAdmin
            .from('invites')
            .select('id, email, role, status, expires_at, org_id, organizations(name)')
            .eq('token_hash', tokenHash)
            .limit(1)
            .single();

        if (error || !invite) {
            return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
        }

        if (invite.status !== 'pending') {
            return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
        }

        if (new Date(invite.expires_at) < new Date()) {
            // Mark as expired
            await supabaseAdmin
                .from('invites')
                .update({ status: 'expired' })
                .eq('id', invite.id);
            return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
        }

        return NextResponse.json({
            invite: {
                id: invite.id,
                email: invite.email,
                role: invite.role,
                org_name: (invite as any).organizations?.name || 'Workspace',
                org_id: invite.org_id,
            }
        });
    } catch (err: any) {
        console.error("[API /team/accept GET] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST: Accept invite token
export async function POST(req: NextRequest) {
    try {
        // 1. Auth verification
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized — please log in first" }, { status: 401 });
        }

        const supabaseRest = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
        );

        const { data: { user }, error: authError } = await supabaseRest.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Parse token
        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        // 3. Hash and find invite
        const tokenHash = createHash('sha256').update(token).digest('hex');

        const { data: invite, error: invError } = await supabaseAdmin
            .from('invites')
            .select('*')
            .eq('token_hash', tokenHash)
            .limit(1)
            .single();

        if (invError || !invite) {
            return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
        }

        // 4. Validations
        if (invite.status !== 'pending') {
            return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
        }

        if (new Date(invite.expires_at) < new Date()) {
            await supabaseAdmin
                .from('invites')
                .update({ status: 'expired' })
                .eq('id', invite.id);
            return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
        }

        // 5. Email match check
        if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
            return NextResponse.json({
                error: `This invite was sent to ${invite.email}. You are logged in as ${user.email}.`
            }, { status: 403 });
        }

        // 6. Check if already a member
        const { data: existingMember } = await supabaseAdmin
            .from('org_members')
            .select('id')
            .eq('org_id', invite.org_id)
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (existingMember) {
            // Mark invite as accepted anyway
            await supabaseAdmin
                .from('invites')
                .update({ status: 'accepted', used_at: new Date().toISOString() })
                .eq('id', invite.id);
            return NextResponse.json({ success: true, message: "Already a member of this organization" });
        }

        // 7. Transaction: create membership + mark invite used
        const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

        const { error: memberError } = await supabaseAdmin
            .from('org_members')
            .insert({
                org_id: invite.org_id,
                user_id: user.id,
                role: invite.role,
                display_name: displayName,
            });

        if (memberError) {
            if (memberError.code === '23505') {
                // Race condition: another request already created the membership
                console.log(`[API /team/accept] Race caught — ${user.email} already a member`);
            } else {
                console.error("[API /team/accept] Member insert error:", memberError);
                return NextResponse.json({ error: "Failed to join organization" }, { status: 500 });
            }
        }

        await supabaseAdmin
            .from('invites')
            .update({ status: 'accepted', used_at: new Date().toISOString() })
            .eq('id', invite.id);

        console.log(`[API /team/accept] ${user.email} joined org ${invite.org_id} as ${invite.role}`);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[API /team/accept POST] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
