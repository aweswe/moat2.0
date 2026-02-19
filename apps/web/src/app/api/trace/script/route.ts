import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
    try {
        const traceId = req.nextUrl.searchParams.get("traceId");

        if (!traceId) {
            return NextResponse.json({ error: "Missing traceId" }, { status: 400 });
        }

        // Try downloading script.py first (new convention)
        const { data: scriptData, error: scriptError } = await supabaseAdmin.storage
            .from("traces")
            .download(`${traceId}/script.py`);

        if (scriptData && !scriptError) {
            const text = await scriptData.text();
            return NextResponse.json({ script: text, source: "script.py" });
        }

        // Fallback: extract from metadata.json (old convention)
        const { data: metaData, error: metaError } = await supabaseAdmin.storage
            .from("traces")
            .download(`${traceId}/metadata.json`);

        if (metaData && !metaError) {
            const text = await metaData.text();
            try {
                const parsed = JSON.parse(text);
                if (parsed.script_content) {
                    return NextResponse.json({ script: parsed.script_content, source: "metadata.json" });
                }
            } catch {
                // metadata.json exists but isn't valid JSON or has no script_content
            }
        }

        return NextResponse.json({ script: null, error: "No script found for this trace" }, { status: 404 });
    } catch (err: any) {
        console.error("[API] Script fetch error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
