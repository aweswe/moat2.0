"use client";

import React, { useState, useEffect } from "react";
import { GitBranch, GitMerge, Hash, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface TraceEvent {
    seq: number;
    type: string;
    payload: any;
    timestamp?: string;
    _branched?: boolean;
}

interface Branch {
    id: string;
    parentTraceId: string;
    forkStep: number;
    name?: string;
    parentHash?: string;
    overridePayload?: any;
    createdAt?: string;
}

interface DiffRow {
    step: number;
    type: string;
    basePayload: any | null;
    branchPayload: any | null;
    diverged: boolean;
    newInBranch: boolean;
    missingInBranch: boolean;
}

function computeDiff(baseEvents: TraceEvent[], branchEvents: TraceEvent[], forkStep: number): DiffRow[] {
    const rows: DiffRow[] = [];

    // Only diff events AFTER the fork point
    const baseAfter = baseEvents.filter(e => e.seq > forkStep);
    const branchAfter = branchEvents.filter(e => e.seq > forkStep);

    const maxLen = Math.max(baseAfter.length, branchAfter.length);

    for (let i = 0; i < maxLen; i++) {
        const base = baseAfter[i];
        const branch = branchAfter[i];

        const step = base?.seq ?? branch?.seq ?? forkStep + i + 1;
        const type = base?.type ?? branch?.type ?? "unknown";

        const basePayload = base?.payload ?? null;
        const branchPayload = branch?.payload ?? null;

        const diverged = base && branch && JSON.stringify(basePayload) !== JSON.stringify(branchPayload);
        const newInBranch = !base && !!branch;
        const missingInBranch = !!base && !branch;

        rows.push({ step, type, basePayload, branchPayload, diverged: !!diverged, newInBranch, missingInBranch });
    }

    return rows;
}

function PayloadCell({ payload, highlight }: { payload: any | null; highlight?: "diverged" | "new" | "missing" }) {
    const [expanded, setExpanded] = useState(false);

    if (payload === null || payload === undefined) {
        return <span className="opacity-30 italic text-[10px]">—</span>;
    }

    const str = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    const isLong = str.length > 80;
    const preview = isLong ? str.slice(0, 80) + "…" : str;

    return (
        <div
            className={cn(
                "font-mono text-[10px] rounded px-2 py-1 cursor-pointer transition-all",
                highlight === "diverged" && "bg-orange-500/10 border border-orange-500/30 text-orange-300",
                highlight === "new" && "bg-green-500/10 border border-green-500/30 text-green-300",
                highlight === "missing" && "bg-red-500/10 border border-red-500/30 text-red-300",
                !highlight && "bg-white/5"
            )}
            onClick={() => isLong && setExpanded(!expanded)}
        >
            {isLong && (
                <span className="mr-1 opacity-50">
                    {expanded ? <ChevronDown className="inline w-3 h-3" /> : <ChevronRight className="inline w-3 h-3" />}
                </span>
            )}
            <pre className="inline whitespace-pre-wrap break-all">{expanded ? str : preview}</pre>
        </div>
    );
}

function EventTypeBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        thought: "bg-purple-500/10 text-purple-400",
        tool_call: "bg-orange-500/10 text-orange-400",
        tool_result: "bg-green-500/10 text-green-400",
        file_write: "bg-blue-500/10 text-blue-400",
        llm_end: "bg-violet-500/10 text-violet-400",
    };
    return (
        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", colors[type] ?? "bg-gray-500/10 text-gray-400")}>
            {type}
        </span>
    );
}

interface MultiverseViewProps {
    traceId: string;
    baseEvents: TraceEvent[];
    branch: Branch;
}

export function MultiverseView({ traceId, baseEvents, branch }: MultiverseViewProps) {
    const [branchEvents, setBranchEvents] = useState<TraceEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hashMatch, setHashMatch] = useState<boolean | null>(null);

    useEffect(() => {
        if (!branch?.id) return;

        setLoading(true);
        setError(null);

        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch("/api/replay", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session?.access_token || ""}`
                    },
                    body: JSON.stringify({ traceId, branch: branch.id }),
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.details || data.error);
                setBranchEvents(data.events || []);
                if (branch.parentHash && data.parentHash) {
                    setHashMatch(branch.parentHash === data.parentHash);
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [traceId, branch?.id]);

    const diffRows = computeDiff(baseEvents, branchEvents, branch.forkStep);
    const divergedCount = diffRows.filter(r => r.diverged || r.newInBranch || r.missingInBranch).length;

    if (loading) {
        return (
            <div className="border border-border/50 rounded-lg p-8 text-center font-mono text-xs opacity-40 animate-pulse">
                LOADING_BRANCH_TIMELINE...
            </div>
        );
    }

    if (error) {
        return (
            <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-6 font-mono text-xs text-red-400">
                <AlertTriangle className="inline w-3 h-3 mr-2" />
                Branch load failed: {error}
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border/50 bg-card/40 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <GitMerge className="w-4 h-4 text-brand" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Multiverse_Diff
                    </span>
                    <Badge variant="secondary" className="font-mono text-[9px]">
                        Fork@step_{branch.forkStep}
                    </Badge>
                    {divergedCount > 0 && (
                        <Badge className="font-mono text-[9px] bg-orange-500/20 text-orange-400 border-orange-500/30">
                            {divergedCount} diverged
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] opacity-50">
                    <Hash className="w-3 h-3" />
                    {hashMatch === true && <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />hash_verified</span>}
                    {hashMatch === false && <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />hash_drift_detected</span>}
                    <span>{branch.name ?? branch.id.slice(0, 12)}</span>
                </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[60px_100px_1fr_1fr] gap-3 px-4 py-2 border-b border-border/30 text-[9px] font-mono uppercase text-muted-foreground">
                <span>Step</span>
                <span>Type</span>
                <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />Base Trace</span>
                <span className="flex items-center gap-1 text-brand"><GitBranch className="w-3 h-3" />Branch: {branch.name ?? "fork"}</span>
            </div>

            {/* Rows */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border/20">
                {diffRows.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono opacity-30">
                        No events after fork point yet. Run "Fork & Run" to generate branch events.
                    </div>
                ) : (
                    diffRows.map((row, i) => (
                        <div
                            key={i}
                            className={cn(
                                "grid grid-cols-[60px_100px_1fr_1fr] gap-3 px-4 py-2 items-start text-xs transition-colors",
                                (row.diverged || row.newInBranch || row.missingInBranch)
                                    ? "bg-orange-500/[0.03]"
                                    : "hover:bg-white/[0.02]"
                            )}
                        >
                            <span className="font-mono text-[10px] opacity-50 pt-1">{row.step}</span>
                            <span className="pt-1"><EventTypeBadge type={row.type} /></span>
                            <PayloadCell
                                payload={row.basePayload}
                                highlight={row.missingInBranch ? "missing" : row.diverged ? "diverged" : undefined}
                            />
                            <PayloadCell
                                payload={row.branchPayload}
                                highlight={row.newInBranch ? "new" : row.diverged ? "diverged" : undefined}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
