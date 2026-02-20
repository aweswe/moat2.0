import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

const EXECUTION_ENGINE_URL = process.env.EXECUTION_ENGINE_URL || "http://127.0.0.1:8000";

/**
 * GET /api/branches?traceId=<id>
 * Lists all branches for a trace. Reads directly from Supabase via Execution Engine.
 * Strictly enforced organization boundary.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const traceId = searchParams.get("traceId");

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = supabaseAdmin;
        const supabaseRest = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false } }
        );
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const orgId = membership.org_id;

        if (traceId) {
            const { data: trace, error: traceError } = await supabase
                .from('traces')
                .select('org_id')
                .eq('id', traceId)
                .single();

            if (traceError || !trace || trace.org_id !== orgId) {
                return NextResponse.json({ error: "Trace not found" }, { status: 404 });
            }
        }

        if (!traceId) {
            return NextResponse.json({ error: "traceId is required for security isolation" }, { status: 400 });
        }

        const engineResponse = await fetch(`${EXECUTION_ENGINE_URL}/branches/list?trace_id=${traceId}`);
        if (!engineResponse.ok) {
            const errResult = await engineResponse.json().catch(() => ({}));
            throw new Error(errResult.detail || `Execution engine returned ${engineResponse.status}`);
        }

        const result = await engineResponse.json();
        return NextResponse.json(result);

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}

/**
 * POST /api/branches
 * Body: { traceId, forkStep, overrideJson, name }
 */
export async function POST(req: Request) {
    try {
        const { traceId, forkStep, overrideJson, name } = await req.json();

        if (!traceId || forkStep === undefined) {
            return NextResponse.json({ error: "traceId and forkStep are required" }, { status: 400 });
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = supabaseAdmin;
        const supabaseRest = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false } }
        );
        const { data: { user }, error: authError } = await supabaseRest.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (!membership?.org_id) return NextResponse.json({ error: "No organization found" }, { status: 403 });

        const orgId = membership.org_id;

        const { data: trace, error: traceError } = await supabase
            .from('traces')
            .select('org_id')
            .eq('id', traceId)
            .single();

        if (traceError || !trace || trace.org_id !== orgId) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        let parsedOverride = null;
        if (overrideJson && typeof overrideJson === "string") {
            try { parsedOverride = JSON.parse(overrideJson); } catch (e) { }
        } else if (overrideJson && typeof overrideJson === "object") {
            parsedOverride = overrideJson;
        }

        const enginePayload = {
            trace_id: traceId,
            fork_step: forkStep,
            override: parsedOverride,
            name: name
        };

        const engineResponse = await fetch(`${EXECUTION_ENGINE_URL}/branches/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(enginePayload)
        });

        if (!engineResponse.ok) {
            const errResult = await engineResponse.json().catch(() => ({}));
            throw new Error(errResult.detail || `Execution engine returned ${engineResponse.status}`);
        }

        const result = await engineResponse.json();
        return NextResponse.json(result);

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
