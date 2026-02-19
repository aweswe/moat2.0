import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

// Helper: verify auth and get caller's membership
async function getCallerMembership(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;

    const supabaseRest = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: { user }, error } = await supabaseRest.auth.getUser();
    if (error || !user) return null;

    const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

    if (!membership) return null;
    return { user, membership };
}

// GET: List org members
export async function GET(req: NextRequest) {
    try {
        const caller = await getCallerMembership(req);
        if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: members, error } = await supabaseAdmin
            .from('org_members')
            .select('id, user_id, role, display_name, created_at')
            .eq('org_id', caller.membership.org_id)
            .order('created_at', { ascending: true });

        if (error) {
            return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
        }

        // Enrich with user emails
        const enriched = await Promise.all((members || []).map(async (m: any) => {
            const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
            return {
                ...m,
                email: u?.email || 'unknown',
            };
        }));

        return NextResponse.json({ members: enriched });
    } catch (err: any) {
        console.error("[API /team/members GET] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH: Update member role (owner only)
export async function PATCH(req: NextRequest) {
    try {
        const caller = await getCallerMembership(req);
        if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (caller.membership.role !== 'owner') {
            return NextResponse.json({ error: "Only owners can change member roles" }, { status: 403 });
        }

        const body = await req.json();
        const { memberId, role } = body;

        if (!memberId || !role) {
            return NextResponse.json({ error: "memberId and role are required" }, { status: 400 });
        }

        if (!['owner', 'dev', 'viewer'].includes(role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        // Cannot demote yourself if you're the only owner
        if (memberId === caller.membership.id && role !== 'owner') {
            const { count } = await supabaseAdmin
                .from('org_members')
                .select('*', { count: 'exact', head: true })
                .eq('org_id', caller.membership.org_id)
                .eq('role', 'owner');

            if ((count || 0) <= 1) {
                return NextResponse.json({ error: "Cannot demote the last owner" }, { status: 400 });
            }
        }

        const { error } = await supabaseAdmin
            .from('org_members')
            .update({ role })
            .eq('id', memberId)
            .eq('org_id', caller.membership.org_id);

        if (error) {
            return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[API /team/members PATCH] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE: Remove member (owner only, cannot remove self)
export async function DELETE(req: NextRequest) {
    try {
        const caller = await getCallerMembership(req);
        if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (caller.membership.role !== 'owner') {
            return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 });
        }

        const memberId = req.nextUrl.searchParams.get('memberId');
        if (!memberId) {
            return NextResponse.json({ error: "memberId is required" }, { status: 400 });
        }

        // Cannot remove yourself
        if (memberId === caller.membership.id) {
            return NextResponse.json({ error: "Cannot remove yourself from the organization" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('org_members')
            .delete()
            .eq('id', memberId)
            .eq('org_id', caller.membership.org_id);

        if (error) {
            return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[API /team/members DELETE] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
