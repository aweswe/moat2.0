import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { trace_id, metadata } = await req.json();

        if (!trace_id || !metadata) {
            return NextResponse.json({ error: 'Missing trace_id or metadata' }, { status: 400 });
        }

        const supabase = supabaseAdmin;

        // Ensure we have an org_id
        let { org_id } = metadata;
        if (!org_id) {
            return NextResponse.json({ error: 'Missing org_id in metadata' }, { status: 400 });
        }

        // Verify Org exists
        const { data: org } = await supabase.from('organizations').select('id').eq('id', org_id).single();
        if (!org) {
            return NextResponse.json({ error: 'Invalid or non-existent org_id' }, { status: 400 });
        }

        // metadata is a JSON object from the python SDK
        // We map it to our 'traces' table columns
        const {
            timestamp,
            duration_s,
            event_count,
            status,
            tags,
            git_commit,
            host_info
        } = metadata;

        // Use upsert to handle updates (e.g. from partial uploads)
        const { data, error } = await supabase
            .from('traces')
            .upsert({
                id: trace_id,
                org_id: org_id,
                created_at: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
                // duration and event_count might not exist as columns, rely on metadata jsonb
                status: status || 'completed',
                // tags might not exist
                metadata: { ...metadata, is_deterministic: true, tags: tags || [] }, // Store full JSON blob for future flexibility, including duration/events
            }, { onConflict: 'id' });

        if (error) {
            console.error('[API] Trace registration failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: trace_id });

    } catch (error) {
        console.error('[API] Trace registration exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
