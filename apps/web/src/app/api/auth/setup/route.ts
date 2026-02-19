import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role key — bypasses RLS, used only server-side
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * POST /api/auth/setup
 * 
 * Called after signup/login to ensure user has an org + membership.
 * Uses service role key to bypass RLS.
 * 
 * Flow:
 *   1. Verify caller identity
 *   2. Check existing membership → return if found
 *   3. Check pending invite (with expiry + single-use enforcement) → join if valid
 *   4. No invite → create new org + owner membership
 * 
 * Race-safe: UNIQUE(user_id, org_id) constraint prevents duplicate memberships.
 * Duplicate org creation prevented by checking membership after constraint error.
 */
export async function POST(req: NextRequest) {
    try {
        // ─── 1. Verify identity ────────────────────────────
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
            authHeader.replace('Bearer ', '')
        );
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const email = (user.email || '').toLowerCase();
        const displayName = user.user_metadata?.full_name || email.split('@')[0] || 'User';

        // ─── 2. Check existing membership ──────────────────
        const { data: existingMemberships } = await supabaseAdmin
            .from('org_members')
            .select('*, organizations(id, name)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(10);

        if (existingMemberships && existingMemberships.length > 0) {
            const primary = existingMemberships[0];
            return NextResponse.json({
                status: 'existing',
                membership: {
                    org_id: primary.org_id,
                    role: primary.role,
                    display_name: primary.display_name,
                    org_name: (primary as any).organizations?.name,
                }
            });
        }

        // ─── 3. Check pending invite (with full validation) ─
        const { data: invites } = await supabaseAdmin
            .from('invites')
            .select('*, organizations(id, name)')
            .eq('email', email)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

        const invite = invites?.[0];

        if (invite) {
            // 3a. Enforce expiration
            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                // Mark expired
                await supabaseAdmin
                    .from('invites')
                    .update({ status: 'expired' })
                    .eq('id', invite.id);

                console.log(`[Auth Setup] Invite ${invite.id} expired for ${email}`);
                // Fall through to org creation — expired invite = no invite
            } else {
                // 3b. Join via invite (race-safe: UNIQUE constraint will catch duplicates)
                const { error: joinError } = await supabaseAdmin
                    .from('org_members')
                    .insert({
                        org_id: invite.org_id,
                        user_id: user.id,
                        role: invite.role,
                        display_name: displayName,
                    });

                if (joinError) {
                    // If duplicate key error → membership already exists (race condition caught)
                    if (joinError.code === '23505') {
                        console.log(`[Auth Setup] Race condition caught — membership already exists for ${email}`);
                        const { data: existing } = await supabaseAdmin
                            .from('org_members')
                            .select('*, organizations(id, name)')
                            .eq('user_id', user.id)
                            .limit(1)
                            .single();

                        if (existing) {
                            return NextResponse.json({
                                status: 'existing',
                                membership: {
                                    org_id: existing.org_id,
                                    role: existing.role,
                                    display_name: existing.display_name,
                                    org_name: (existing as any).organizations?.name,
                                }
                            });
                        }
                    }
                    console.error("[Auth Setup] Join via invite failed:", joinError.message);
                    return NextResponse.json({ error: "Failed to join organization" }, { status: 500 });
                }

                // 3c. Mark invite as accepted (single-use enforcement)
                await supabaseAdmin
                    .from('invites')
                    .update({ status: 'accepted', used_at: new Date().toISOString() })
                    .eq('id', invite.id)
                    .eq('status', 'pending'); // Only update if still pending (prevents double-accept)

                console.log(`[Auth Setup] ${email} joined org ${invite.org_id} via invite as ${invite.role}`);

                return NextResponse.json({
                    status: 'joined',
                    membership: {
                        org_id: invite.org_id,
                        role: invite.role,
                        display_name: displayName,
                        org_name: (invite as any).organizations?.name,
                    }
                });
            }
        }

        // ─── 4. No valid invite → create new org + owner ────
        const orgName = `${displayName}'s Workspace`;

        const { data: newOrg, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({ name: orgName })
            .select()
            .single();

        if (orgError || !newOrg) {
            console.error("[Auth Setup] Org creation failed:", orgError?.message);
            return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
        }

        // Race-safe: UNIQUE(user_id, org_id) constraint prevents duplicate
        const { error: memberError } = await supabaseAdmin
            .from('org_members')
            .insert({
                org_id: newOrg.id,
                user_id: user.id,
                role: 'owner',
                display_name: displayName,
            });

        if (memberError) {
            if (memberError.code === '23505') {
                // Race condition: another request already created membership
                console.log(`[Auth Setup] Race caught on org creation for ${email}`);
                const { data: existing } = await supabaseAdmin
                    .from('org_members')
                    .select('*, organizations(id, name)')
                    .eq('user_id', user.id)
                    .limit(1)
                    .single();

                if (existing) {
                    return NextResponse.json({
                        status: 'existing',
                        membership: {
                            org_id: existing.org_id,
                            role: existing.role,
                            display_name: existing.display_name,
                            org_name: (existing as any).organizations?.name,
                        }
                    });
                }
            }
            console.error("[Auth Setup] Membership creation failed:", memberError.message);
            return NextResponse.json({ error: "Failed to create membership" }, { status: 500 });
        }

        console.log(`[Auth Setup] Created org "${orgName}" (${newOrg.id}) for ${email}`);

        return NextResponse.json({
            status: 'created',
            membership: {
                org_id: newOrg.id,
                role: 'owner',
                display_name: displayName,
                org_name: orgName,
            }
        });
    } catch (err: any) {
        console.error("[Auth Setup] Unhandled error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
