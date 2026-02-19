import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/trace/events?traceId=xxx
 *
 * Returns events for a trace, with org isolation enforced server-side.
 * Auth: JWT from browser session.
 *
 * Data sources (cascading):
 *   1. trace_events DB table
 *   2. Supabase Storage events.jsonl (Python SDK traces)
 */
export async function GET(req: NextRequest) {
    try {
        const traceId = req.nextUrl.searchParams.get("traceId");
        if (!traceId) {
            return NextResponse.json({ error: "Missing traceId" }, { status: 400 });
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

        // 3. Verify trace belongs to user's org
        const { data: trace } = await supabaseAdmin
            .from("traces")
            .select("id")
            .eq("id", traceId)
            .eq("org_id", membership.org_id)
            .single();

        if (!trace) {
            return NextResponse.json({ error: "Trace not found" }, { status: 404 });
        }

        // 4. Fetch events — DB first, then Storage fallback
        // Strategy A: trace_events table
        const { data: dbEvents, error: dbError } = await supabaseAdmin
            .from("trace_events")
            .select("*")
            .eq("trace_id", traceId)
            .order("seq", { ascending: true });

        if (!dbError && dbEvents && dbEvents.length > 0) {
            const events = dbEvents.map((e: any) => ({
                seq: e.seq,
                timestamp: e.timestamp,
                type: e.type,
                ...e.payload,
                payload: e.payload,
            }));
            return NextResponse.json({ events, source: "db" });
        }

        // Strategy B: Storage events.jsonl (Python SDK traces)
        try {
            const { data: fileData, error: fileError } = await supabaseAdmin.storage
                .from("traces")
                .download(`${traceId}/events.jsonl`);

            if (!fileError && fileData) {
                const text = await fileData.text();
                const events = text
                    .split("\n")
                    .filter((line: string) => line.trim())
                    .map((line: string) => {
                        try { return JSON.parse(line); } catch { return null; }
                    })
                    .filter(Boolean);

                if (events.length > 0) {
                    return NextResponse.json({ events, source: "storage" });
                }
            }
        } catch {
            // Storage not available
        }

        // No events found anywhere
        return NextResponse.json({ events: [], source: "none" });
    } catch (err: any) {
        console.error("[API] /trace/events error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
