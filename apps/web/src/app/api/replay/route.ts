import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

const EXECUTION_ENGINE_URL = process.env.EXECUTION_ENGINE_URL || "http://127.0.0.1:8000";

/**
 * POST /api/replay
 * Body: { traceId: string, step?: number, branch?: string }
 *
 * Calls the deterministic execution sandbox and returns:
 *   - stdout (full sandbox log)
 *   - replay_fingerprint (SHA-256)
 *   - events_consumed
 *   - branch metadata (if forked)
 */
export async function POST(req: Request) {
    try {
        const { traceId, step, branch, governanceLevel } = await req.json();

        if (!traceId) {
            return NextResponse.json({ error: "traceId is required" }, { status: 400 });
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user auth
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

        // Verify org access
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

        // Call the deterministic execution sandbox
        const enginePayload: Record<string, any> = { trace_id: traceId };
        if (branch) enginePayload.branch_id = branch;
        if (governanceLevel) enginePayload.governance_level = governanceLevel;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);

        let engineResponse: Response;
        try {
            engineResponse = await fetch(`${EXECUTION_ENGINE_URL}/replay/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(enginePayload),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!engineResponse.ok) {
            const errResult = await engineResponse.json().catch(() => ({}));
            throw new Error(errResult.detail || `Execution engine returned ${engineResponse.status}`);
        }

        const result = await engineResponse.json();

        return NextResponse.json({
            success: result.success,
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
            exitCode: result.exit_code,
            replayFingerprint: result.replay_fingerprint,
            eventsConsumed: result.events_consumed,
            branch: result.branch ?? null,
            events: result.new_events ?? [],
            eventCount: result.events_consumed,
            step: step ?? null,
            parentHash: result.replay_fingerprint,
            maxStep: result.events_consumed,
        });

    } catch (e: any) {
        console.error("[API] POST /replay error:", e);
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
