import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * PATCH /api/trace/[id]/rename
 * Body: { title: string }
 * Updates trace title + sets updated_by to the current user.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;
        const { title } = await req.json();

        if (!title || typeof title !== "string" || title.trim().length === 0) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

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

        // Only owners and devs can rename
        if (!["owner", "admin", "dev"].includes(membership.role)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        // Update
        const { data, error } = await supabaseAdmin
            .from("traces")
            .update({ title: title.trim(), updated_by: user.id })
            .eq("id", traceId)
            .eq("org_id", membership.org_id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, trace: data });
    } catch (err: any) {
        console.error("[API] /trace/[id]/rename error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
