import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * PATCH /api/trace/[id]/priority
 * Body: { priority: "red" | "yellow" | "green" | null }
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;
        const { priority } = await req.json();

        if (priority !== null && !["red", "yellow", "green"].includes(priority)) {
            return NextResponse.json({ error: "Invalid priority. Use red, yellow, green, or null." }, { status: 400 });
        }

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

        const { data: membership } = await supabaseAdmin
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        const { error } = await supabaseAdmin
            .from("traces")
            .update({ priority, updated_by: user.id })
            .eq("id", traceId)
            .eq("org_id", membership.org_id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[API] /trace/[id]/priority error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
