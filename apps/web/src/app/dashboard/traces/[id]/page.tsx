"use client";

import { useParams } from "next/navigation";
import { useTrace, useJobs } from "@/hooks/use-database";
import { supabase } from "@/lib/supabase";
import * as React from "react";
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

interface TraceEvent {
    timestamp: string;
    type: string;
    payload: any;
    seq: number;
}

export default function TraceDetailPage() {
    const params = useParams();
    const traceId = params.id as string;
    const { trace, loading: traceLoading } = useTrace(traceId);
    const [events, setEvents] = React.useState<TraceEvent[]>([]);
    const [eventsLoading, setEventsLoading] = React.useState(true);
    const [selectedEvent, setSelectedEvent] = React.useState<TraceEvent | null>(null);
    const [sliderValue, setSliderValue] = React.useState(0);
    const [isReplaying, setIsReplaying] = React.useState(false);

    React.useEffect(() => {
        if (!traceId) return;

        const downloadEvents = async () => {
            setEventsLoading(true);
            try {
                const { data, error } = await supabase.storage
                    .from('traces')
                    .download(`${traceId}/events.jsonl`);

                if (error) throw error;

                const text = await data.text();
                const lines = text.trim().split('\n').filter(l => l.trim());
                const parsed = lines.map(l => JSON.parse(l));
                setEvents(parsed);
                if (parsed.length > 0) setSelectedEvent(parsed[0]);
            } catch (err) {
                console.error("Error downloading events:", err);
            } finally {
                setEventsLoading(false);
            }
        };

        downloadEvents();
    }, [traceId]);

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
                        </div>
                        <p className="text-muted-foreground text-xs font-mono opacity-60 mt-1">UUID: {traceId} // {new Date(trace.created_at).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="font-mono text-[10px] border-brand/20 text-brand hover:bg-brand/5"
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
                        <Terminal className="w-3 h-3 mr-2" /> RAW_JSON
                    </Button>
                    <Button
                        size="sm"
                        className="font-mono text-[10px]"
                        disabled={isReplaying}
                        onClick={async () => {
                            try {
                                setIsReplaying(true);
                                const res = await fetch('/api/replay', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ traceId })
                                });

                                const data = await res.json();

                                if (!res.ok) {
                                    throw new Error(data.details || data.error || "Unknown server error");
                                }

                                if (data.success && data.newTraceId) {
                                    // Redirect to new trace
                                    window.location.href = `/dashboard/traces/${data.newTraceId}`;
                                } else {
                                    alert("Replay started, but no new trace ID returned.\nCheck console for details.");
                                    console.log("Replay output:", data.output);
                                }
                            } catch (e: any) {
                                console.error("Replay failed", e);
                                let errorMsg = e.message;
                                if (e.details) errorMsg += `\n\nDetails: ${e.details}`;
                                if (e.stderr) errorMsg += `\n\nStderr: ${e.stderr.slice(0, 500)}`;

                                alert(`Failed to trigger replay: ${errorMsg}`);
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
                        {isReplaying ? "RUNNING..." : "RE-REPLAY"}
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
                                    {events.map((event, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedEvent(event)}
                                            className={cn(
                                                "p-4 cursor-pointer transition-all hover:bg-white/[0.03] group flex items-start gap-4",
                                                selectedEvent === event && "bg-brand/5 border-l-2 border-l-brand"
                                            )}
                                        >
                                            <div className="mt-1 opacity-40 group-hover:opacity-100 text-[10px] tabular-nums">
                                                {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.{new Date(event.timestamp).getMilliseconds().toString().padStart(3, '0')}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase",
                                                        event.type === 'thought' ? 'bg-purple-500/10 text-purple-400' :
                                                            event.type === 'tool_call' ? 'bg-orange-500/10 text-orange-400' :
                                                                event.type === 'tool_result' ? 'bg-green-500/10 text-green-400' :
                                                                    'bg-gray-500/10 text-gray-400'
                                                    )}>
                                                        {event.type}
                                                    </span>
                                                    <span className="opacity-80 text-[10px]">
                                                        {event.type === 'thought' ? event.payload.thought :
                                                            event.type === 'tool_call' ? event.payload.name :
                                                                event.type === 'tool_result' ? event.payload.tool_name :
                                                                    JSON.stringify(event.payload).slice(0, 100)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
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
                                    <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                                        <pre className="text-[10px] font-mono text-brand overflow-auto max-h-[400px]">
                                            {JSON.stringify(selectedEvent.payload, null, 2)}
                                        </pre>
                                    </div>
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
                                <span>Python_3.12</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground uppercase">Worker_Node</span>
                                <span className="text-brand">Node-Delta-04</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground uppercase">Memory_Usage</span>
                                <span>124MB</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
