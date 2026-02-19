import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import { sendInviteEmail } from '@/lib/brevo';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

// POST: Owner sends invite
export async function POST(req: NextRequest) {
    try {
        // 1. Auth verification
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        // 2. Verify caller is an owner
        const { data: membership } = await supabaseAdmin
            .from('org_members')
            .select('org_id, role')
            .eq('user_id', user.id)
            .eq('role', 'owner')
            .limit(1)
            .single();

        if (!membership) {
            return NextResponse.json({ error: "Only organization owners can invite members" }, { status: 403 });
        }

        // 3. Parse request body
        const body = await req.json();
        const { role } = body;
        const email = (body.email || '').toLowerCase().trim();

        if (!email || !role) {
            return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
        }

        if (!['dev', 'viewer'].includes(role)) {
            return NextResponse.json({ error: "Role must be 'dev' or 'viewer'" }, { status: 400 });
        }

        // 4. Check if user is already a member
        //    Look up existing members' emails to see if this email is already in the org
        const { data: orgMembers } = await supabaseAdmin
            .from('org_members')
            .select('user_id')
            .eq('org_id', membership.org_id);

        if (orgMembers && orgMembers.length > 0) {
            // Check each member's email
            for (const m of orgMembers) {
                const { data: { user: memberUser } } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
                if (memberUser?.email?.toLowerCase() === email) {
                    return NextResponse.json({ error: "User is already a member of this organization" }, { status: 409 });
                }
            }
        }

        // 5. Check for existing pending invite
        const { data: existingInvite } = await supabaseAdmin
            .from('invites')
            .select('id')
            .eq('org_id', membership.org_id)
            .eq('email', email) // DB trigger ensures lowercase
            .eq('status', 'pending')
            .limit(1)
            .single();

        if (existingInvite) {
            return NextResponse.json({ error: "An invite is already pending for this email" }, { status: 409 });
        }

        // 6. Generate secure token
        const token = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(token).digest('hex');

        // 7. Insert invite
        const { error: insertError } = await supabaseAdmin
            .from('invites')
            .insert({
                org_id: membership.org_id,
                email,
                role,
                token_hash: tokenHash,
                invited_by: user.id,
            });

        if (insertError) {
            console.error("[API /team/invite] Insert error:", insertError);
            return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
        }

        // 8. Build invite link
        const baseUrl = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteLink = `${baseUrl}/join?token=${token}`;

        // 9. Send email via Brevo (best-effort, non-blocking)
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('name')
            .eq('id', membership.org_id)
            .single();

        const emailResult = await sendInviteEmail({
            to: email,
            orgName: org?.name || 'AgentTrace Workspace',
            role,
            inviteLink,
            inviterName: user.user_metadata?.full_name || user.email?.split('@')[0],
        });

        return NextResponse.json({
            success: true,
            inviteLink,
            emailSent: emailResult.success,
        });
    } catch (err: any) {
        console.error("[API /team/invite] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
