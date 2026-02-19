import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { trace_id, events } = body;

        if (!trace_id || !events || !Array.isArray(events)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        console.log(`[SDK] Ingesting ${events.length} events for trace ${trace_id}`);

        // Insert into trace_events table
        const { error } = await supabaseAdmin
            .from("trace_events")
            .insert(
                events.map((ev: any) => ({
                    trace_id,
                    seq: ev.seq,
                    type: ev.type,
                    payload: ev.payload,
                    timestamp: ev.timestamp ? new Date(Number(ev.timestamp) * 1000).toISOString() : new Date().toISOString()
                }))
            );

        if (error) {
            console.error("[SDK] Database insert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[SDK] Ingest worker error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
