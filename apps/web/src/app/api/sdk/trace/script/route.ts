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

        // Upload script content to storage as metadata.json (SDK's convention)
        if (script_content) {
            const { error: uploadError } = await supabaseAdmin.storage
                .from("traces")
                .upload(`${trace_id}/metadata.json`, JSON.stringify({
                    script_content,
                    created_at: new Date().toISOString()
                }), {
                    contentType: 'application/json',
                    upsert: true
                });

            if (uploadError) {
                console.error("[SDK] Initial script upload error:", uploadError);
                return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[SDK] Script upload worker error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
