import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/trace/[id]
 *
 * Returns trace record + metadata, with org isolation enforced server-side.
 * Auth: JWT from browser session.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: traceId } = await params;
        if (!traceId) {
            return NextResponse.json({ error: "Missing trace ID" }, { status: 400 });
        }

        // 1. Auth — resolve user from JWT
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

        // 2. Org isolation — verify membership
        const { data: membership } = await supabaseAdmin
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) {
            return NextResponse.json({ error: "No organization" }, { status: 403 });
        }

        // 3. Fetch trace with org filter (service role bypasses RLS)
        const { data: traceData, error: traceError } = await supabaseAdmin
            .from("traces")
            .select("*")
            .eq("id", traceId)
            .eq("org_id", membership.org_id)
            .single();

        if (traceError || !traceData) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        // 4. Build metadata from DB record
        const metadata = {
            title: traceData.title || "",
            source: (traceData.metadata as any)?.source || "api",
            status: traceData.status || "completed",
            runtime: (traceData.metadata as any)?.runtime || "Python_3.x",
            created_at: traceData.created_at,
            script_path: (traceData.metadata as any)?.script_path || null,
        };

        // 5. Enrich with Storage metadata.json (Python SDK traces only)
        const source = (traceData.metadata as any)?.source;
        if (source === "python_sdk" || source === "sdk") {
            try {
                const { data: metaFile, error: metaError } = await supabaseAdmin.storage
                    .from("traces")
                    .download(`${traceId}/metadata.json`);

                if (!metaError && metaFile) {
                    const parsed = JSON.parse(await metaFile.text());
                    Object.assign(metadata, parsed);
                }
            } catch {
                // Storage not available — DB metadata is sufficient
            }
        }

        // 6. Fetch source code (script.py) from Storage — needed by fork dialog
        try {
            const { data: scriptFile, error: scriptError } = await supabaseAdmin.storage
                .from("traces")
                .download(`${traceId}/script.py`);

            if (!scriptError && scriptFile) {
                (metadata as any).script_content = await scriptFile.text();
            }
        } catch {
            // No script available — that's fine
        }

        return NextResponse.json({ trace: traceData, metadata });
    } catch (err: any) {
        console.error("[API] /trace/[id] error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
