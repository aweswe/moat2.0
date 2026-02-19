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

    return (
        <div
            onClick={onSelect}
            className={cn(
                "p-4 cursor-pointer transition-all hover:bg-white/[0.03] group flex items-start gap-4 relative pr-12",
                isSelected && "bg-brand/5 border-l-2 border-l-brand",
                !isSelected && isMismatch && "bg-red-500/5 border-l-2 border-l-red-500"
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
                                    event.type === 'file_write' ? 'bg-blue-500/10 text-blue-400' :
                                        'bg-gray-500/10 text-gray-400'
                    )}>
                        {event.type}
                    </span>
                    {isMismatch && (
                        <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse">
                            DIVERGED
                        </span>
                    )}
                    <span className={cn(
                        "opacity-80 text-[10px] line-clamp-1",
                        isMismatch && "text-red-400 font-bold"
                    )}>
                        {event.type === 'thought' ? event.payload.thought :
                            event.type === 'tool_call' ? event.payload.name :
                                event.type === 'tool_result' ? event.payload.tool_name :
                                    event.type === 'file_write' ? event.payload.path :
                                        JSON.stringify(event.payload).slice(0, 100)}
                    </span>
                </div>
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
                    <GitFork className="h-3 w-3 text-muted-foreground hover:text-brand" />
                </Button>
            )}
        </div>
    );
}
