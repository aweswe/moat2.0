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
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
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
    Cpu,
    FileCode2,
    Copy,
    Check,
    TerminalSquare,
    ShieldCheck,
    GitFork,
    Pencil,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BranchPicker } from "@/components/trace/BranchPicker";
import { TraceEventRow } from "@/components/trace/TraceEventRow";
import { MultiverseView } from "@/components/trace/MultiverseView";
import { BranchingProvider, useBranching } from "@/components/trace/BranchingProvider";
import ScriptViewer from "@/components/trace/ScriptViewer";
import { useRealtime } from "@/hooks/use-realtime";
import { ModeToggle } from "@/components/landing/mode-toggle";

interface TraceEvent {
    timestamp: string;
    type: string;
    payload: any;
    seq: number;
}

function TraceDetailInner() {
    const params = useParams();
    const { user, hasPermission } = useAuth();
    const traceId = params.id as string;
    const { trace, metadata, audit, loading: traceLoading } = useTrace(traceId);

    const { branches, activeBranchId, refreshBranches, createBranch, isLoading } = useBranching();
    const canBranch = hasPermission('create_branch');
    const { events, loading: eventsLoading, fetchEvents } = useTraceEvents(traceId, activeBranchId);

    const [parentEvents, setParentEvents] = React.useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = React.useState<TraceEvent | null>(null);
    const [sliderValue, setSliderValue] = React.useState(0);
    const [isReplaying, setIsReplaying] = React.useState(false);
    const [replayState, setReplayState] = React.useState<any>(null);
    const [showReplayPanel, setShowReplayPanel] = React.useState(false);
    const [replayViewMode, setReplayViewMode] = React.useState<'simple' | 'dev'>('simple');
    const [activeDiffBranch, setActiveDiffBranch] = React.useState<any>(null);
    const [showScript, setShowScript] = React.useState(false);
    const [cliCopied, setCliCopied] = React.useState(false);

    // Inline rename state
    const [isEditing, setIsEditing] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState("");
    const [saving, setSaving] = React.useState(false);

    const handleSaveTitle = async () => {
        if (!editTitle.trim() || saving) return;
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/trace/${traceId}/rename`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token || ""}`,
                },
                body: JSON.stringify({ title: editTitle.trim() }),
            });
            if (res.ok) {
                setIsEditing(false);
                // Force a soft refresh of the page to show new title
                window.location.reload();
            }
        } catch (e) {
            console.error("Rename failed:", e);
        } finally {
            setSaving(false);
        }
    };

    const handleTrash = async () => {
        if (!confirm("Move this trace to trash? You can restore it later.")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/trace/${traceId}/trash`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${session?.access_token || ""}` },
            });
            if (res.ok) {
                window.location.href = "/dashboard/traces";
            }
        } catch (e) {
            console.error("Trash failed:", e);
        }
    };

    // Forking state
    const [isForkDialogOpen, setIsForkDialogOpen] = React.useState(false);
    const [forkTargetEvent, setForkTargetEvent] = React.useState<TraceEvent | null>(null);
    const [overrideJson, setOverrideJson] = React.useState("");

    React.useEffect(() => {
        if (forkTargetEvent) {
            setOverrideJson(JSON.stringify(forkTargetEvent.payload, null, 2));
        }
    }, [forkTargetEvent]);

    // Realtime: auto-refresh when CLI replay pushes new branch events
    useRealtime({
        traceId,
        onBranchUpdate: React.useCallback(() => {
            refreshBranches(traceId);
        }, [refreshBranches, traceId]),
    });

    const currentStep = events.length > 0
        ? Math.floor((sliderValue / 100) * (events.length - 1))
        : 0;

    const cliCommand = `agenttrace replay --session ${traceId} --step ${currentStep}${activeBranchId ? ` --branch ${activeBranchId}` : ''}`;

    const copyCliCommand = async () => {
        await navigator.clipboard.writeText(cliCommand);
        setCliCopied(true);
        setTimeout(() => setCliCopied(false), 2000);
    };

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
            // Find first error event for "2-Second Ah-Ha"
            const firstErrorIdx = events.findIndex((e: any) => e.type === 'error' || e.payload?.status === 'error');
            const targetIdx = firstErrorIdx !== -1 ? firstErrorIdx : 0;

            setSelectedEvent(events[targetIdx]);
            setSliderValue(Math.floor((targetIdx / Math.max(events.length - 1, 1)) * 100));

            // Auto-scroll to the error event
            setTimeout(() => {
                const rowId = `event-row-${targetIdx}`;
                const el = document.getElementById(rowId);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [events, selectedEvent]);

    // Keyboard Navigation (VIM style)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't hijack keystrokes if they are typing in an input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || isEditing || isForkDialogOpen) return;

            if (e.key === 'j' || e.key === 'ArrowDown') {
                e.preventDefault();
                const currIdx = events.findIndex((ev: any) => ev === selectedEvent);
                if (currIdx < events.length - 1) {
                    const nextEv = events[currIdx + 1];
                    setSelectedEvent(nextEv);
                    setSliderValue(Math.floor(((currIdx + 1) / Math.max(events.length - 1, 1)) * 100));
                    document.getElementById(`event-row-${currIdx + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else if (e.key === 'k' || e.key === 'ArrowUp') {
                e.preventDefault();
                const currIdx = events.findIndex((ev: any) => ev === selectedEvent);
                if (currIdx > 0) {
                    const prevEv = events[currIdx - 1];
                    setSelectedEvent(prevEv);
                    setSliderValue(Math.floor(((currIdx - 1) / Math.max(events.length - 1, 1)) * 100));
                    document.getElementById(`event-row-${currIdx - 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else if (e.key === 'f') {
                e.preventDefault();
                if (canBranch && selectedEvent && !isForkDialogOpen) {
                    setForkTargetEvent(selectedEvent);
                    setIsForkDialogOpen(true);
                } else if (isForkDialogOpen) {
                    setIsForkDialogOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [events, selectedEvent, isEditing, isForkDialogOpen, canBranch]);

    if (traceLoading) {
        return (
            <div className="flex items-center justify-center min-h-[100dvh] bg-zinc-50 dark:bg-[#0e0e11] text-zinc-700 dark:text-zinc-300">
                <div className="text-sm font-medium animate-pulse flex items-center gap-3">
                    <History className="w-5 h-5 animate-spin text-zinc-400 dark:text-zinc-500" />
                    Loading trace timeline...
                </div>
            </div>
        );
    }

    if (!trace) {
        return (
            <div className="p-8 mt-12 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl max-w-md mx-auto">
                <AlertCircle className="w-8 h-8 mx-auto mb-4 text-zinc-400 dark:text-zinc-500" />
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-300">Trace Not Found</h2>
                <p className="text-sm text-zinc-500 mt-2">The requested ID does not exist in the current organization space.</p>
                <Button variant="outline" className="mt-6 text-xs text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => window.history.back()}>
                    &larr; Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-[#0e0e11] text-zinc-800 dark:text-zinc-300 flex flex-col overflow-hidden font-sans animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0e0e11]">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full hover:bg-zinc-100 dark:hover:bg-white/5">
                        <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="h-8 text-lg font-bold w-64"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveTitle();
                                            if (e.key === "Escape") setIsEditing(false);
                                        }}
                                    />
                                    <Button size="sm" onClick={handleSaveTitle} disabled={saving}>
                                        {saving ? "Saving..." : "Save"}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                </div>
                            ) : (
                                <h1
                                    className="text-lg font-semibold tracking-tight cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors group/title flex items-center gap-2"
                                    onClick={() => {
                                        setEditTitle(trace.title || "Untitled Trace");
                                        setIsEditing(true);
                                    }}
                                    title="Click to rename"
                                >
                                    {trace.title || "Untitled Trace"}
                                    <Pencil className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                                </h1>
                            )}
                            <div className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800",
                                trace.status === 'failed' && "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border-red-200 dark:border-red-500/20"
                            )}>
                                {trace.status}
                            </div>
                            {(trace.status === 'completed' || trace.status === 'ready') && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                    <span className="text-[10px] font-medium text-emerald-500">Verified</span>
                                </div>
                            )}
                            <BranchPicker traceId={traceId} />
                        </div>
                        <p className="text-zinc-500 text-xs mt-1 font-mono">{traceId} <span className="text-zinc-700 mx-2">•</span> <span className="font-sans">{new Date(trace.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span></p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                <Terminal className="w-3.5 h-3.5 mr-2" /> JSON
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[1000px] h-[80vh] flex flex-col bg-white dark:bg-[#0e0e11] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                            <DialogHeader>
                                <DialogTitle>Raw Trace Events</DialogTitle>
                                <DialogDescription className="text-zinc-500 dark:text-zinc-400">
                                    Technical data stream for trace {traceId}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 bg-zinc-50 dark:bg-[#14151a] p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-auto font-mono text-[10px]">
                                <pre className="text-zinc-600 dark:text-zinc-300">
                                    {JSON.stringify(events, null, 2)}
                                </pre>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                        variant="outline"
                        size="sm"
                        className="text-xs border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => setShowScript(!showScript)}
                    >
                        <FileCode2 className="w-3.5 h-3.5 mr-2" />
                        {showScript ? "Hide Source" : "Source Code"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={copyCliCommand}
                    >
                        {cliCopied ? <Check className="w-3.5 h-3.5 mr-2" /> : <TerminalSquare className="w-3.5 h-3.5 mr-2" />}
                        {cliCopied ? "Copied" : "Re-run Local"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        disabled={isLoading || !canBranch || !selectedEvent}
                        onClick={() => {
                            if (!selectedEvent) return;
                            setForkTargetEvent(selectedEvent);
                            setIsForkDialogOpen(true);
                        }}
                        title={!canBranch ? "Only Owners and Devs can create branches" : `Create a new branch from Step ${selectedEvent?.seq ?? 0}`}
                    >
                        <GitFork className="w-3.5 h-3.5 mr-2" />
                        {isLoading ? "Forking..." : `Fork at Step ${selectedEvent?.seq ?? 0}`}
                    </Button>
                    <Button
                        size="sm"
                        className="text-xs bg-zinc-900 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white font-medium"
                        disabled={isReplaying}
                        //... logic remains in the next snippet if I split it, wait I must include logic here
                        onClick={async () => {
                            try {
                                setIsReplaying(true);
                                setReplayState(null);

                                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                                if (sessionError || !session?.access_token) {
                                    alert("Authentication failed. Please sign in again.");
                                    return;
                                }

                                const res = await fetch('/api/replay', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session.access_token}`
                                    },
                                    body: JSON.stringify({
                                        traceId,
                                        branch: activeBranchId || undefined
                                    })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.details || data.error || "Unknown server error");
                                setReplayState(data);
                                setShowReplayPanel(true);
                            } catch (e: any) {
                                console.error("Sandbox replay failed", e);
                                alert(`Sandbox failed: ${e.message}`);
                            } finally {
                                setIsReplaying(false);
                            }
                        }}
                    >
                        {isReplaying ? (
                            <Clock className="w-3.5 h-3.5 mr-2 animate-spin" />
                        ) : (
                            <Cpu className="w-3.5 h-3.5 mr-2" />
                        )}
                        {isReplaying ? "Running..." : activeBranchId ? "Run Branch" : "Run Sandbox"}
                    </Button>
                    <ModeToggle />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={handleTrash}
                        title="Trash Trace"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Main Layout Area */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* L Pane: Timeline (Dense, scannable) */}
                <div className="w-[340px] flex-none border-r border-zinc-200 dark:border-white/5 flex flex-col bg-white dark:bg-black/20">
                    <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/5 flex items-center gap-2 text-[10px] font-semibold uppercase text-zinc-500 dark:text-white/50 tracking-wider">
                        <History className="w-3.5 h-3.5" /> Timeline Loop
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {eventsLoading ? (
                            <div className="p-12 text-center text-zinc-500 text-xs font-semibold animate-pulse">Streaming Events...</div>
                        ) : events.length === 0 ? (
                            <div className="p-12 text-center text-zinc-500 italic text-xs font-semibold">No Events Captured</div>
                        ) : (
                            <div className="pb-24">
                                {events.map((event: TraceEvent, i: number) => (
                                    <div id={`event-row-${i}`} key={i}>
                                        <TraceEventRow
                                            event={event}
                                            expectedEvent={parentEventMap.get(event.seq)}
                                            isSelected={selectedEvent === event}
                                            onSelect={() => {
                                                setSelectedEvent(event);
                                                setSliderValue(Math.floor((i / Math.max(events.length - 1, 1)) * 100));
                                            }}
                                            onFork={(e) => {
                                                setForkTargetEvent(e);
                                                setIsForkDialogOpen(true);
                                            }}
                                            traceId={traceId}
                                            scriptContent={metadata?.script_content}
                                            canBranch={canBranch}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Center Pane: Context (Source code + Direct Event info) */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 dark:border-zinc-800">
                    <div className="flex-none px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-[#111113]">
                        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                            <Box className="w-4 h-4 text-zinc-500" /> Execution Context
                        </div>
                        {selectedEvent && (
                            <div className="text-xs font-mono text-zinc-500">
                                {selectedEvent.type.toUpperCase()}_{selectedEvent.seq}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Event Context Bubble */}
                        {selectedEvent ? (
                            <div className="space-y-6">
                                {/* Auto-rendered UI specific to event types */}
                                {selectedEvent.type === 'thought' && (
                                    <div className="bg-[#14151a] border border-purple-500/20 rounded-xl p-5">
                                        <h3 className="text-purple-400 font-semibold text-sm mb-3 flex items-center gap-2">
                                            <Cpu className="w-4 h-4" /> Agent Reasoning
                                        </h3>
                                        <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                                            {selectedEvent.payload.thought}
                                        </p>
                                    </div>
                                )}

                                {selectedEvent.type === 'tool_call' && (
                                    <div className="bg-[#14151a] border border-blue-500/20 rounded-xl p-5">
                                        <h3 className="text-blue-400 font-semibold text-sm mb-3 flex items-center gap-2">
                                            <Zap className="w-4 h-4" /> Tool Invocation: {selectedEvent.payload.name}
                                        </h3>
                                        <div className="text-xs font-mono text-zinc-300 bg-[#0e0e11] p-4 rounded-lg border border-zinc-800 overflow-auto">
                                            {JSON.stringify(selectedEvent.payload.arguments || selectedEvent.payload, null, 2)}
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.type === 'error' && (
                                    <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl p-5">
                                        <h3 className="text-red-600 dark:text-red-400 font-semibold text-sm mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Exception
                                        </h3>
                                        <p className="text-sm font-mono leading-relaxed text-red-700 dark:text-red-300 whitespace-pre-wrap bg-red-100 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900/30">
                                            {selectedEvent.payload.error || selectedEvent.payload.message || JSON.stringify(selectedEvent.payload)}
                                        </p>
                                    </div>
                                )}

                                {/* Divergence Warning */}
                                {parentEventMap.has(selectedEvent.seq) && JSON.stringify(selectedEvent.payload) !== JSON.stringify(parentEventMap.get(selectedEvent.seq).payload) && (
                                    <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5">
                                        <h3 className="text-amber-600 dark:text-amber-500 font-semibold text-sm mb-3 flex items-center gap-2">
                                            <GitFork className="w-4 h-4" /> Divergence Detected
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <div className="text-xs text-zinc-500">Expected (Parent)</div>
                                                <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg overflow-auto max-h-[200px]">
                                                    {JSON.stringify(parentEventMap.get(selectedEvent.seq).payload, null, 2)}
                                                </pre>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="text-xs text-amber-600 dark:text-amber-500">Actual (Current)</div>
                                                <pre className="text-xs font-mono text-amber-700 dark:text-amber-400/80 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 p-4 rounded-lg overflow-auto max-h-[200px]">
                                                    {JSON.stringify(selectedEvent.payload, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Raw Payload Fallback (if not explicitly handled above or user wants to see everything) */}
                                {(!['thought', 'tool_call', 'error'].includes(selectedEvent.type) || !parentEventMap.has(selectedEvent.seq)) && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-zinc-500">Raw Payload Data</div>
                                        <div className="bg-zinc-100 dark:bg-[#0e0e11] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                            <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-auto max-h-[400px]">
                                                {JSON.stringify(selectedEvent.payload, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                                Select an event from the timeline to view details
                            </div>
                        )}

                        {/* Always show Script Viewer below context if enabled */}
                        {showScript && (
                            <div className="mt-8 border-t border-zinc-200 dark:border-white/5 pt-8">
                                <ScriptViewer
                                    traceId={traceId}
                                    highlightLine={selectedEvent?.payload?.line}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: State & Metadata */}
                <div className="w-[300px] flex-none flex flex-col bg-zinc-50 dark:bg-[#14151a]">
                    <div className="flex-none px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-300">
                        <TerminalSquare className="w-4 h-4 text-zinc-500" /> State Monitor
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Environment</h4>
                            <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-sm font-medium space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Runtime</span>
                                    <span className="text-zinc-800 dark:text-zinc-300">{metadata?.runtime ?? "Unknown"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Nodes</span>
                                    <span className="text-zinc-800 dark:text-zinc-300">{events.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Final State</span>
                                    <span className={trace?.status === 'completed' ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}>
                                        {trace?.status?.toUpperCase() ?? "UNKNOWN"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">CLI Replay Cmd</h4>
                            <div className="bg-zinc-100 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/50 rounded-lg p-3 group relative cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800/50 transition-colors" onClick={copyCliCommand}>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400">
                                    {cliCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </div>
                                <code className="text-xs font-mono text-zinc-700 dark:text-zinc-300 block pr-6 break-all">
                                    {cliCommand}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SPLIT SCREEN SANDBOX (Branched Timeline Overlay) */}
                {isForkDialogOpen && forkTargetEvent && (
                    <div className="absolute inset-0 z-30 flex animate-in slide-in-from-right-16 duration-300">
                        {/* Semi-transparent backdrop to fade the main timeline */}
                        <div
                            className="w-[340px] flex-none bg-black/40 backdrop-blur-sm cursor-pointer transition-colors hover:bg-black/50"
                            onClick={() => setIsForkDialogOpen(false)}
                            title="Click to cancel branching"
                        />

                        {/* The Sandbox Console */}
                        <div className="flex-1 flex flex-col bg-white dark:bg-[#0e0e11] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl">
                            <div className="flex-none px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#111113] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <GitFork className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Branch Reality Sandbox</h2>
                                        <p className="text-xs text-zinc-500 mt-0.5">Diverging from Step {forkTargetEvent.seq}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsForkDialogOpen(false)}
                                    className="text-zinc-500 hover:text-zinc-300"
                                >
                                    Cancel (Esc)
                                </Button>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                {/* Left: Target Event Override */}
                                <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                                        <Zap className="w-3.5 h-3.5" /> Payload Override
                                    </div>
                                    <p className="text-sm text-zinc-500 leading-relaxed">
                                        You are altering the state of the agent at <strong className="text-zinc-800 dark:text-zinc-300">Step {forkTargetEvent.seq}</strong>.
                                        Modify the JSON payload below to spin up a fresh sandbox from this new reality.
                                    </p>

                                    <div className="flex-1 flex flex-col relative group mt-2">
                                        <Textarea
                                            value={overrideJson}
                                            onChange={(e) => setOverrideJson(e.target.value)}
                                            className="flex-1 resize-none bg-zinc-50 dark:bg-[#14151a] border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 font-mono text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-700 p-4 leading-relaxed"
                                            spellCheck={false}
                                        />
                                        <div className="absolute top-4 right-4 text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded select-none shadow-sm">
                                            JSON
                                        </div>
                                    </div>

                                    <Button
                                        size="lg"
                                        className="w-full bg-zinc-900 dark:bg-zinc-200 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold mt-4"
                                        onClick={async () => {
                                            try {
                                                const payload = JSON.parse(overrideJson);
                                                await createBranch(traceId, forkTargetEvent.seq, `Fork at Step ${forkTargetEvent.seq}`, payload);
                                                setIsForkDialogOpen(false);
                                            } catch (e) {
                                                alert("Invalid JSON format in payload override");
                                            }
                                        }}
                                        disabled={isLoading}
                                    >
                                        <Cpu className="w-4 h-4 mr-2" />
                                        {isLoading ? "Running Sandbox..." : "Execute Branch"}
                                    </Button>
                                </div>

                                {/* Right: Context Reference */}
                                <div className="w-[400px] flex-none flex flex-col p-6 space-y-4 bg-zinc-50 dark:bg-[#14151a]">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                                        <FileCode2 className="w-3.5 h-3.5" /> Source Context
                                    </div>

                                    <div className="flex-1 bg-white dark:bg-[#0e0e11] rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 overflow-auto relative group">
                                        {metadata?.script_content ? (
                                            <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                                                {metadata.script_content}
                                            </pre>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-zinc-600 text-sm italic">
                                                No script context available
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase bg-zinc-50 dark:bg-[#14151a] border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded select-none shadow-sm">
                                            READ-ONLY
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Unified Bottom Scrubber */}
            <div className="flex-none h-16 bg-white dark:bg-[#111113] border-t border-zinc-200 dark:border-zinc-800 px-6 flex items-center gap-6 shadow-md z-20">
                <div className="w-16 flex flex-col items-center justify-center shrink-0 border-r border-zinc-200 dark:border-zinc-800 pr-6">
                    <div className="text-[10px] font-semibold text-zinc-500 uppercase">Keys</div>
                    <div className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 mt-1 flex gap-1">
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shadow-sm border border-zinc-200 dark:border-zinc-700/50">J</span>
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shadow-sm border border-zinc-200 dark:border-zinc-700/50">K</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center h-full relative cursor-pointer group">
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
                                document.getElementById(`event-row-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }}
                        className="w-full absolute inset-y-0 opacity-0 cursor-pointer z-10"
                    />

                    {/* Visual Scrubber Track */}
                    <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full relative overflow-hidden group-hover:h-1.5 transition-all">
                        <div
                            className="absolute left-0 top-0 bottom-0 bg-zinc-500 dark:bg-zinc-400 rounded-full transition-all duration-100 ease-linear"
                            style={{ width: `${sliderValue}%` }}
                        />
                    </div>
                </div>

                <div className="w-20 shrink-0 text-right border-l border-zinc-200 dark:border-zinc-800 pl-6">
                    <div className="text-sm font-semibold font-mono text-zinc-600 dark:text-zinc-400">{sliderValue}%</div>
                </div>
            </div>

            {/* Replay Results Panel — Full-width inline, above scrubber */}
            {showReplayPanel && replayState && (
                <div className="flex-none border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#111113] animate-in slide-in-from-bottom-4 duration-300 z-20">
                    {/* Panel Header with Mode Toggle */}
                    <div className="flex items-center justify-between px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                    {replayState.branch ? `Branch Replay — ${replayState.branch.name ?? replayState.branch.branch_id?.slice(0, 8)}` : "Sandbox Replay"}
                                </span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${replayState.exitCode === 0 ? 'bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'}`}>
                                {replayState.exitCode === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                {replayState.exitCode === 0 ? 'Passed' : `Failed (Exit ${replayState.exitCode})`}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Dev / Simple Toggle */}
                            <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 rounded-lg p-0.5">
                                <button
                                    onClick={() => setReplayViewMode('simple')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${replayViewMode === 'simple' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                >
                                    Summary
                                </button>
                                <button
                                    onClick={() => setReplayViewMode('dev')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${replayViewMode === 'dev' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                >
                                    Dev Details
                                </button>
                            </div>
                            <button onClick={() => setShowReplayPanel(false)} className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Simple View — Clean summary */}
                    {replayViewMode === 'simple' && (
                        <div className="px-6 py-4 flex items-start gap-6">
                            <div className="flex-1">
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                    {replayState.exitCode === 0 ? (
                                        <>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Agent completed successfully.</span>{' '}
                                            Consumed {replayState.eventsConsumed ?? 0} events and produced a deterministic output. The replay fingerprint matched the original execution.
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-semibold text-red-600 dark:text-red-400">Agent execution failed</span> with exit code {replayState.exitCode}.{' '}
                                            {replayState.stderr ? `Error: ${replayState.stderr.split('\n')[0]?.slice(0, 120)}` : 'Check the Dev Details for full stack trace.'}
                                        </>
                                    )}
                                </p>
                                {replayState.stdout && (
                                    <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                                        Output: {replayState.stdout.split('\n').filter((l: string) => l.trim()).slice(0, 2).join(' | ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500 shrink-0 pt-0.5">
                                <div><span className="font-medium">Events:</span> {replayState.eventsConsumed ?? 0}</div>
                                <div className="font-mono">{replayState.replayFingerprint?.slice(0, 8) ?? '—'}</div>
                            </div>
                        </div>
                    )}

                    {/* Dev View — Full details */}
                    {replayViewMode === 'dev' && (
                        <div className="px-6 py-4 space-y-3">
                            <div className="flex items-center gap-6 text-xs">
                                <div className="flex items-center gap-4">
                                    <div><span className="text-zinc-500">Events Consumed:</span> <span className="text-zinc-800 dark:text-zinc-200 font-semibold ml-1">{replayState.eventsConsumed ?? 0}</span></div>
                                    <div><span className="text-zinc-500">Exit Code:</span> <span className={`font-semibold ml-1 ${replayState.exitCode === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{replayState.exitCode}</span></div>
                                    <div><span className="text-zinc-500">Fingerprint:</span> <span className="text-zinc-800 dark:text-zinc-200 font-mono font-medium ml-1">{replayState.replayFingerprint ?? '—'}</span></div>
                                </div>
                            </div>
                            {replayState.stdout && (
                                <div className="space-y-1">
                                    <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Standard Output</div>
                                    <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 max-h-[180px] overflow-auto whitespace-pre-wrap leading-relaxed">
                                        {replayState.stdout.split('\n').filter((l: string) => l.trim()).join('\n')}
                                    </pre>
                                </div>
                            )}
                            {replayState.stderr && (
                                <div className="space-y-1">
                                    <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Standard Error</div>
                                    <pre className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 max-h-[120px] overflow-auto whitespace-pre-wrap">
                                        {replayState.stderr}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Overlay Views */}
            <div className="absolute top-20 right-8 w-1/3 z-40 max-w-sm flex flex-col gap-4 pointer-events-none">
                {/* Multiverse Diff View */}
                {activeDiffBranch && (
                    <div className="pointer-events-auto shadow-2xl animate-in slide-in-from-right-8 duration-300 bg-white dark:bg-[#0e0e11] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <MultiverseView
                            traceId={traceId}
                            baseEvents={events}
                            branch={activeDiffBranch}
                        />
                        <button
                            onClick={() => setActiveDiffBranch(null)}
                            className="w-full text-center py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 bg-zinc-50 dark:bg-[#111113] hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 transition-colors"
                        >
                            Close Diff View
                        </button>
                    </div>
                )}
            </div>

            {/* Branch selector overlay bottom left */}
            {branches.length > 0 && !activeDiffBranch && (
                <div className="absolute bottom-20 left-6 z-30 flex items-center gap-3 text-sm bg-white/90 dark:bg-zinc-900/90 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-lg backdrop-blur-md">
                    <GitFork className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-600 dark:text-zinc-400 text-xs font-medium">Available Branches</span>
                    <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                        {branches.map((b: any) => (
                            <button
                                key={b.id}
                                onClick={() => setActiveDiffBranch(b)}
                                className="px-3 py-1 text-xs font-medium rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900 dark:hover:bg-zinc-200 hover:text-white dark:hover:text-zinc-900 hover:border-zinc-900 dark:hover:border-zinc-300 transition-colors"
                            >
                                {b.name ?? b.id.slice(0, 8)}
                            </button>
                        ))}
                    </div>
                </div>
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
