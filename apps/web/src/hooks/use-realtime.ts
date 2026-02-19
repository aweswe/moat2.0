"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface RealtimeOptions {
    /** The trace ID to watch for branch updates */
    traceId: string;
    /** Called when a branch row is inserted or updated */
    onBranchUpdate?: (branch: any) => void;
    /** Whether the subscription is active */
    enabled?: boolean;
}

/**
 * Hook that subscribes to Supabase Realtime on the `branches` table,
 * filtered by `trace_id`. Triggers a callback when a branch is created
 * or updated (e.g., status → "completed" after local CLI replay).
 */
export function useRealtime({ traceId, onBranchUpdate, enabled = true }: RealtimeOptions) {
    const channelRef = useRef<any>(null);

    const cleanup = useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!enabled || !traceId) return;

        // Clean up any previous subscription
        cleanup();

        const channel = supabase
            .channel(`branches:${traceId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "branches",
                    filter: `trace_id=eq.${traceId}`,
                },
                (payload: any) => {
                    console.log("[Realtime] Branch update:", payload.eventType, payload.new?.id?.slice(0, 8));
                    if (onBranchUpdate) {
                        onBranchUpdate(payload.new);
                    }
                }
            )
            .subscribe((status: string) => {
                if (status === "SUBSCRIBED") {
                    console.log(`[Realtime] Watching branches for trace ${traceId.slice(0, 8)}`);
                }
            });

        channelRef.current = channel;

        return cleanup;
    }, [traceId, enabled, onBranchUpdate, cleanup]);

    return { cleanup };
}
