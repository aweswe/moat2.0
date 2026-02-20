import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

const EXECUTION_ENGINE_URL = process.env.EXECUTION_ENGINE_URL || "http://127.0.0.1:8000";

/**
 * POST /api/replay
 * Body: { traceId: string, step?: number, branch?: string }
 *
 * Returns hydrated state from the recorded event stream via FastAPI Backend.
 */
export async function POST(req: Request) {
    try {
        const { traceId, step, branch } = await req.json();

        if (!traceId) {
            return NextResponse.json({ error: "traceId is required" }, { status: 400 });
        }

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
            return NextResponse.json({ error: "Unauthorized", details: authError?.message }, { status: 401 });
        }

        const supabase = supabaseAdmin;
        const { data: membership, error: memberError } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (memberError || !membership?.org_id) {
            return NextResponse.json({ error: "No organization access" }, { status: 403 });
        }

        const { data: trace } = await supabase
            .from('traces')
            .select('org_id')
            .eq('id', traceId)
            .single();

        if (!trace || trace.org_id !== membership.org_id) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        const enginePayload = {
            trace_id: traceId,
            step: step !== undefined ? step : null,
            branch_id: branch || null
        };

        const engineResponse = await fetch(`${EXECUTION_ENGINE_URL}/replay/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(enginePayload)
        });

        if (!engineResponse.ok) {
            const errResult = await engineResponse.json().catch(() => ({}));
            throw new Error(errResult.detail || `Execution engine returned ${engineResponse.status}`);
        }

        const result = await engineResponse.json();

        // Normalize events to match the format from /api/trace/events
        const normalizedEvents = (result.events || []).map((e: any) => {
            const seq = e.seq ?? e.step ?? 0;
            const type = e.type ?? e.event_type ?? "unknown";
            const timestamp = e.timestamp ?? null;

            const payloadContent = { ...e };
            delete payloadContent.seq;
            delete payloadContent.step;
            delete payloadContent.type;
            delete payloadContent.event_type;
            delete payloadContent.timestamp;

            return {
                seq,
                timestamp,
                type,
                ...payloadContent,
                payload: payloadContent
            };
        });

        return NextResponse.json({
            success: true,
            events: normalizedEvents,
            eventCount: result.eventCount,
            branchId: result.branchId,
            forkStep: result.forkStep
        });

    } catch (e: any) {
        console.error("[API] POST /replay error:", e);
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
