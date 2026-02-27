import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/trace/[id]/trash — Soft delete (move to trash)
 * POST /api/trace/[id]/trash?action=restore — Restore from trash
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;
        const action = req.nextUrl.searchParams.get("action"); // "restore" or null

        // Auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseRest = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false },
        });

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Org isolation
        const { data: membership } = await supabaseAdmin
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        if (!["owner", "admin", "dev"].includes(membership.role)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        if (action === "restore") {
            // Restore from trash
            const { error } = await supabaseAdmin
                .from("traces")
                .update({ deleted_at: null, updated_by: user.id })
                .eq("id", traceId)
                .eq("org_id", membership.org_id)
                .not("deleted_at", "is", null);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, action: "restored" });
        } else {
            // Move to trash
            const { error } = await supabaseAdmin
                .from("traces")
                .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
                .eq("id", traceId)
                .eq("org_id", membership.org_id)
                .is("deleted_at", null);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, action: "trashed" });
        }
    } catch (err: any) {
        console.error("[API] /trace/[id]/trash error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/trace/[id]/trash — Permanent delete (only from trash)
 * Purges trace, events, branches, and storage files.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;

        // Auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseRest = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false },
        });

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Org isolation
        const { data: membership } = await supabaseAdmin
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        // Only owners can permanently delete
        if (membership.role !== "owner") {
            return NextResponse.json({ error: "Only owners can permanently delete traces" }, { status: 403 });
        }

        // Verify trace is in trash
        const { data: trace } = await supabaseAdmin
            .from("traces")
            .select("id, deleted_at")
            .eq("id", traceId)
            .eq("org_id", membership.org_id)
            .not("deleted_at", "is", null)
            .single();

        if (!trace) {
            return NextResponse.json({ error: "Trace not found in trash" }, { status: 404 });
        }

        // Delete in order: events → branches → trace → storage
        await supabaseAdmin.from("trace_events").delete().eq("trace_id", traceId);
        await supabaseAdmin.from("branches").delete().eq("trace_id", traceId);
        await supabaseAdmin.from("traces").delete().eq("id", traceId);

        // Clean up storage (fire-and-forget)
        try {
            const { data: files } = await supabaseAdmin.storage
                .from("traces")
                .list(traceId);

            if (files && files.length > 0) {
                const paths = files.map((f: { name: string }) => `${traceId}/${f.name}`);
                await supabaseAdmin.storage.from("traces").remove(paths);
            }
        } catch {
            // Storage cleanup is best-effort
        }

        return NextResponse.json({ success: true, action: "permanently_deleted" });
    } catch (err: any) {
        console.error("[API] /trace/[id]/trash DELETE error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
