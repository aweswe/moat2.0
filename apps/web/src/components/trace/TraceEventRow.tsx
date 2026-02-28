import { cn } from "@/lib/utils";
import { GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranching } from "./BranchingProvider";
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
import { useState, useMemo, useEffect } from "react";

interface TraceEvent {
    timestamp: string;
    type: string;
    payload: any;
    seq: number;
}

interface TraceEventRowProps {
    event: TraceEvent;
    expectedEvent?: TraceEvent;
    isSelected: boolean;
    onSelect: () => void;
    onFork?: (event: TraceEvent) => void;
    traceId: string;
    scriptContent?: string;
    canBranch?: boolean;
}

export function TraceEventRow({ event, expectedEvent, isSelected, onSelect, onFork, traceId, scriptContent, canBranch = false }: TraceEventRowProps) {
    const { isLoading } = useBranching();
    const isDivergent = expectedEvent && JSON.stringify(event.payload) !== JSON.stringify(expectedEvent.payload);
    const isNewType = expectedEvent && event.type !== expectedEvent.type;
    const isMismatch = isDivergent || isNewType;

    // Clean dot colors based on event type
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'thought': return 'bg-purple-500';
            case 'tool_call': return 'bg-blue-500';
            case 'tool_result': return 'bg-emerald-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-zinc-500';
        }
    };

    const getTypeText = (type: string) => {
        switch (type) {
            case 'thought': return 'text-purple-600 dark:text-purple-400';
            case 'tool_call': return 'text-blue-600 dark:text-blue-400';
            case 'tool_result': return 'text-emerald-600 dark:text-emerald-400';
            case 'error': return 'text-red-600 dark:text-red-400';
            default: return 'text-zinc-600 dark:text-zinc-400';
        }
    };

    return (
        <div
            onClick={onSelect}
            className={cn(
                "group relative flex items-center gap-3 px-4 py-2 cursor-pointer transition-all border-l-2",
                isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800/40 border-l-zinc-900 dark:border-l-zinc-300"
                    : isMismatch
                        ? "bg-red-500/5 border-l-red-500 hover:bg-red-500/10"
                        : "border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
            )}
        >
            {/* Scrubber / Selection Indicator */}
            {isSelected && (
                <div className="absolute inset-y-0 left-0 w-[2px] bg-zinc-900 dark:bg-zinc-300" />
            )}

            {/* Clean Dot */}
            <div className={cn("w-2 h-2 rounded-full shrink-0", getTypeColor(event.type))} />

            {/* Timestamp */}
            <div className="shrink-0 w-[64px] font-mono text-[11px] text-zinc-500 tabular-nums">
                <div className="mt-1 group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.{new Date(event.timestamp).getMilliseconds().toString().padStart(3, '0')}
                </div>
            </div>

            {/* Content Segment */}
            <div className="flex-1 flex items-center gap-3 min-w-0 pr-8">
                <span className={cn("shrink-0 text-xs font-semibold tracking-wide", getTypeText(event.type))}>
                    {event.type.replace('_', ' ')}
                </span>

                {isMismatch && (
                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20">
                        Diverged
                    </span>
                )}

                <span className={cn(
                    "truncate text-[13px] text-zinc-700 dark:text-zinc-300 font-medium",
                    isMismatch && "text-red-600 dark:text-red-400"
                )}>
                    {event.type === 'thought' ? event.payload.thought :
                        event.type === 'tool_call' ? event.payload.name :
                            event.type === 'tool_result' ? event.payload.tool_name :
                                event.type === 'file_write' ? event.payload.path :
                                    event.type === 'error' ? event.payload.error || event.payload.message :
                                        JSON.stringify(event.payload)}
                </span>
            </div>

            {/* Hover Action: Fork — only visible to owners and devs */}
            {canBranch && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6"
                    onClick={(e) => {
                        e.stopPropagation();
                        onFork?.(event);
                    }}
                    disabled={isLoading}
                    title="Fork from here"
                >
                    <GitFork className="h-3 w-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" />
                </Button>
            )}
        </div>
    );
}
