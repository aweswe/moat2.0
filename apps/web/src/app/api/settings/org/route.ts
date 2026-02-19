import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

// GET: Fetch current org info
export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
            authHeader.replace('Bearer ', '')
        );
        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabaseAdmin
            .from('org_members')
            .select('org_id, role')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership) return NextResponse.json({ error: "No organization found" }, { status: 404 });

        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('*')
            .eq('id', membership.org_id)
            .single();

        return NextResponse.json({
            organization: org,
            role: membership.role,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH: Update org profile (owner-only)
export async function PATCH(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
            authHeader.replace('Bearer ', '')
        );
        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabaseAdmin
            .from('org_members')
            .select('org_id, role')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership || membership.role !== 'owner') {
            return NextResponse.json({ error: "Only owners can update organization settings" }, { status: 403 });
        }

        const body = await req.json();
        const updates: any = {};

        if (body.name !== undefined) updates.name = body.name.trim();
        if (body.slug !== undefined) updates.slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const { data: updated, error } = await supabaseAdmin
            .from('organizations')
            .update(updates)
            .eq('id', membership.org_id)
            .select()
            .single();

        if (error) {
            console.error("[API /settings/org PATCH]", error);
            return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
        }

        return NextResponse.json({ organization: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
