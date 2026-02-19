"use client";

import { useParams } from "next/navigation";
import { useTrace, useJobs, useTraceEvents } from "@/hooks/use-database";
import { supabase } from "@/lib/supabase";
import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Terminal,
    History,
    AlertCircle,
    CheckCircle2,
    Clock,
    Zap,
    ArrowLeft,
    Box,
    FileText,
    Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BranchPicker } from "@/components/trace/BranchPicker";
import { TraceEventRow } from "@/components/trace/TraceEventRow";
import { MultiverseView } from "@/components/trace/MultiverseView";
import { BranchingProvider, useBranching } from "@/components/trace/BranchingProvider";

interface TraceEvent {
    timestamp: string;
    type: string;
    payload: any;
    seq: number;
}

function TraceDetailInner() {
    const params = useParams();
    const traceId = params.id as string;
    const { trace, metadata, loading: traceLoading } = useTrace(traceId);
    const { events, loading: eventsLoading, fetchEvents } = useTraceEvents(traceId);
    const [parentEvents, setParentEvents] = React.useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = React.useState<TraceEvent | null>(null);
    const [sliderValue, setSliderValue] = React.useState(0);
    const [isReplaying, setIsReplaying] = React.useState(false);
    const [replayState, setReplayState] = React.useState<any>(null);
    const [showReplayPanel, setShowReplayPanel] = React.useState(false);
    const [activeDiffBranch, setActiveDiffBranch] = React.useState<any>(null);
    const { branches, activeBranchId } = useBranching();

    React.useEffect(() => {
        if (trace?.parent_trace_id) {
            fetchEvents(trace.parent_trace_id).then(setParentEvents);
        }
    }, [trace?.parent_trace_id, fetchEvents]);

    const parentEventMap = React.useMemo(() => {
        const map = new Map<number, any>();
        parentEvents.forEach(e => map.set(e.seq, e));
        return map;
    }, [parentEvents]);

    React.useEffect(() => {
        if (events.length > 0 && !selectedEvent) {
            setSelectedEvent(events[0]);
        }
    }, [events, selectedEvent]);

    if (traceLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="font-mono text-xs animate-pulse">INITIATING_SYSTEM_HYDRATION...</div>
            </div>
        );
    }

    if (!trace) {
        return (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl opacity-50">
                <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
                <h2 className="text-xl font-bold opacity-80">TRACE_NOT_FOUND</h2>
                <p className="text-xs font-mono mt-2">The requested ID does not exist in the current organization space.</p>
                <Button variant="outline" className="mt-6 font-mono text-[10px]" onClick={() => window.history.back()}>
                    RETURN_TO_BASE &larr;
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full hover:bg-white/5">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{trace.title || "Untitled_Trace"}</h1>
                            <div className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-brand/10 text-brand border border-brand/20",
                                trace.status === 'failed' && "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                                {trace.status}
                            </div>
                            <BranchPicker traceId={traceId} />
                        </div>
                        <p className="text-muted-foreground text-xs font-mono opacity-60 mt-1">UUID: {traceId} // {new Date(trace.created_at).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="font-mono text-[10px] border-brand/20 text-brand hover:bg-brand/5"
                            >
                                <Terminal className="w-3 h-3 mr-2" /> RAW_JSON
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[1000px] h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Raw Trace Events</DialogTitle>
                                <DialogDescription>
                                    Technical data stream for trace {traceId}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 bg-black/40 p-4 rounded-lg border border-white/10 overflow-auto font-mono text-[10px]">
                                <pre className="text-brand">
                                    {JSON.stringify(events, null, 2)}
                                </pre>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `trace-${traceId}.json`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    Download JSON
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button
                        size="sm"
                        className="font-mono text-[10px]"
                        disabled={isReplaying}
                        onClick={async () => {
                            try {
                                setIsReplaying(true);
                                setReplayState(null);
                                // Pure event replay — no script re-execution
                                const currentStep = events.length > 0
                                    ? Math.floor((sliderValue / 100) * (events.length - 1))
                                    : undefined;
                                const res = await fetch('/api/replay', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ traceId, step: currentStep })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.details || data.error || "Unknown server error");
                                setReplayState(data);
                                setShowReplayPanel(true);
                            } catch (e: any) {
                                console.error("Replay failed", e);
                                alert(`Replay failed: ${e.message}`);
                            } finally {
                                setIsReplaying(false);
                            }
                        }}
                    >
                        {isReplaying ? (
                            <Clock className="w-3 h-3 mr-2 animate-spin" />
                        ) : (
                            <Zap className="w-3 h-3 mr-2" />
                        )}
                        {isReplaying ? "LOADING..." : "RE-REPLAY"}
                    </Button>
                </div>
            </div>

            {/* Seeker Bar */}
            <Card className="bg-card/40 border-border p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] font-mono uppercase opacity-60">
                            <span>{events.length > 0 ? `Step ${Math.floor((sliderValue / 100) * (events.length - 1))}` : "No_Steps"}</span>
                            <span>Historical_Scrub_v8</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={sliderValue}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setSliderValue(val);
                                if (events.length > 0) {
                                    const index = Math.floor((val / 100) * (events.length - 1));
                                    setSelectedEvent(events[index]);
                                }
                            }}
                            className="w-full h-1 bg-brand/20 rounded-lg appearance-none cursor-pointer accent-brand"
                        />
                    </div>
                    <div className="w-24 text-center border-l border-border pl-4">
                        <div className="text-xl font-bold font-mono text-brand">{sliderValue}%</div>
                        <div className="text-[9px] font-mono uppercase opacity-50">Offset</div>
                    </div>
                </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Timeline Bar */}
                <Card className="md:col-span-8 bg-card/40 border-border">
                    <CardHeader className="pb-3 border-b border-border/50">
                        <CardTitle className="text-xs font-mono flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            <History className="w-3 h-3" /> Event_Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[600px] overflow-y-auto font-mono text-xs">
                            {eventsLoading ? (
                                <div className="p-12 text-center opacity-40">STREAMING_EVENTS...</div>
                            ) : events.length === 0 ? (
                                <div className="p-12 text-center opacity-40 italic text-[10px]">NO_EVENTS_CAPTURED</div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {events.map((event: TraceEvent, i: number) => (
                                        <TraceEventRow
                                            key={i}
                                            event={event}
                                            expectedEvent={parentEventMap.get(event.seq)}
                                            isSelected={selectedEvent === event}
                                            onSelect={() => setSelectedEvent(event)}
                                            traceId={traceId}
                                            scriptContent={metadata?.script_content}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Details Panel */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="bg-card/40 border-border overflow-hidden">
                        <CardHeader className="bg-brand/5 border-b border-brand/10">
                            <CardTitle className="text-xs font-mono flex items-center gap-2 text-brand uppercase tracking-wider">
                                <Box className="w-3 h-3" /> Event_Inspector
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 overflow-x-auto">
                            {selectedEvent ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground uppercase opacity-60">
                                        <div>SEQ_NO: {selectedEvent.seq || 0}</div>
                                        <div>TYPE: {selectedEvent.type}</div>
                                    </div>

                                    {parentEventMap.has(selectedEvent.seq) && JSON.stringify(selectedEvent.payload) !== JSON.stringify(parentEventMap.get(selectedEvent.seq).payload) ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <div className="text-[9px] font-bold uppercase text-red-400 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> Historical_Record
                                                    </div>
                                                    <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/20">
                                                        <pre className="text-[10px] font-mono text-red-300 overflow-auto max-h-[300px]">
                                                            {JSON.stringify(parentEventMap.get(selectedEvent.seq).payload, null, 2)}
                                                        </pre>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="text-[9px] font-bold uppercase text-brand flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Current_Execution
                                                    </div>
                                                    <div className="bg-brand/5 p-3 rounded-lg border border-brand/20">
                                                        <pre className="text-[10px] font-mono text-brand overflow-auto max-h-[300px]">
                                                            {JSON.stringify(selectedEvent.payload, null, 2)}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-mono text-red-400">
                                                DIVERGENCE_DETECTED: This step differs from the parent trace. The agent took a different path.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                                            <pre className="text-[10px] font-mono text-brand overflow-auto max-h-[400px]">
                                                {JSON.stringify(selectedEvent.payload, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-12 text-center opacity-30 text-[10px] font-mono italic uppercase">
                                    SELECT_EVENT_TO_INSPECT
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-card/40 border-border">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-xs font-mono flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                <Cpu className="w-3 h-3" /> Execution_Node
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-[10px] font-mono space-y-2 opacity-80">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground uppercase">Runtime</span>
                                <span>{metadata?.runtime ?? "Python_3.x"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground uppercase">Event_Count</span>
                                <span className="text-brand">{events.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground uppercase">Status</span>
                                <span className={trace?.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>{trace?.status?.toUpperCase() ?? "UNKNOWN"}</span>
                            </div>
                            {metadata?.script_path && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground uppercase">Script</span>
                                    <span className="text-xs opacity-60 truncate max-w-[120px]" title={metadata.script_path}>{metadata.script_path.split(/[\/\\]/).pop()}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Replay State Panel */}
            {showReplayPanel && replayState && (
                <div className="mt-6 rounded-lg border border-brand/20 bg-brand/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold uppercase text-brand flex items-center gap-2">
                            <Zap className="w-3 h-3" /> Replayed_State @ Step {replayState.step ?? "all"}
                        </span>
                        <button onClick={() => setShowReplayPanel(false)} className="text-xs opacity-40 hover:opacity-80">✕ close</button>
                    </div>
                    <div className="font-mono text-[10px] grid grid-cols-3 gap-3 mb-3 text-muted-foreground">
                        <span>Events: <span className="text-foreground">{replayState.eventCount}</span></span>
                        <span>Max Step: <span className="text-foreground">{replayState.maxStep}</span></span>
                        <span>Hash: <span className="text-foreground opacity-60">{replayState.parentHash?.slice(0, 12)}…</span></span>
                    </div>
                    <pre className="text-[10px] font-mono bg-black/40 border border-white/5 rounded p-3 max-h-[300px] overflow-auto text-brand/80">
                        {JSON.stringify(replayState.state, null, 2)}
                    </pre>
                </div>
            )}

            {/* Multiverse Diff View */}
            {activeDiffBranch && (
                <div className="mt-6">
                    <MultiverseView
                        traceId={traceId}
                        baseEvents={events}
                        branch={activeDiffBranch}
                    />
                </div>
            )}

            {/* Branch selector for diff */}
            {branches.length > 0 && !activeDiffBranch && (
                <div className="mt-6 flex items-center gap-3 font-mono text-xs opacity-60">
                    <span className="uppercase">Branches available —</span>
                    {branches.map((b: any) => (
                        <button
                            key={b.id}
                            onClick={() => setActiveDiffBranch(b)}
                            className="px-3 py-1 rounded border border-border/50 hover:border-brand/50 hover:text-brand transition-colors"
                        >
                            Diff: {b.name ?? b.id.slice(0, 10)}
                        </button>
                    ))}
                </div>
            )}
            {activeDiffBranch && (
                <button
                    onClick={() => setActiveDiffBranch(null)}
                    className="mt-2 font-mono text-[10px] opacity-40 hover:opacity-80"
                >
                    ✕ close diff
                </button>
            )}
        </div>
    );
}

export default function TraceDetailPage() {
    return (
        <BranchingProvider>
            <TraceDetailInner />
        </BranchingProvider>
    );
}
