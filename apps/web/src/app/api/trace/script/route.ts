import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    try {
        const traceId = req.nextUrl.searchParams.get("traceId");

        if (!traceId) {
            return NextResponse.json({ error: "Missing traceId" }, { status: 400 });
        }

        // 1. Auth verification
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseRest = createClient(supabaseUrl!, supabaseAnonKey, {
            auth: { persistSession: false }
        });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Org isolation via org_members
        const { data: membership } = await supabaseAdmin
            .from('org_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) {
            return NextResponse.json({ error: "No organization found" }, { status: 403 });
        }

        // 3. Verify trace belongs to user's org
        const { data: trace } = await supabaseAdmin
            .from('traces')
            .select('id')
            .eq('id', traceId)
            .eq('org_id', membership.org_id)
            .single();

        if (!trace) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // 4. Fetch script
        const { data: scriptData, error: scriptError } = await supabaseAdmin.storage
            .from("traces")
            .download(`${traceId}/script.py`);

        if (scriptData && !scriptError) {
            const text = await scriptData.text();
            return NextResponse.json({ script: text, source: "script.py" });
        }

        // Fallback: extract from metadata.json
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
