import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { trace_id, script_content } = body;

        if (!trace_id) {
            return NextResponse.json({ error: "Missing trace_id" }, { status: 400 });
        }

        console.log(`[SDK] Initial script upload for trace ${trace_id}`);

        if (script_content) {
            // 1. Upload as metadata.json (SDK convention)
            const { error: metaError } = await supabaseAdmin.storage
                .from("traces")
                .upload(`${trace_id}/metadata.json`, JSON.stringify({
                    script_content,
                    created_at: new Date().toISOString()
                }), {
                    contentType: 'application/json',
                    upsert: true
                });

            if (metaError) {
                console.error("[SDK] Metadata upload error:", metaError);
            }

            // 2. Upload as standalone script.py (for code viewer)
            const { error: scriptError } = await supabaseAdmin.storage
                .from("traces")
                .upload(`${trace_id}/script.py`, script_content, {
                    contentType: 'text/x-python',
                    upsert: true
                });

            if (scriptError) {
                console.error("[SDK] Script upload error:", scriptError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[SDK] Script upload worker error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
