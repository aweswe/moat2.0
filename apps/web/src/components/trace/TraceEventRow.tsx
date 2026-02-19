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
import { useState } from "react";

interface TraceEvent {
    timestamp: string;
    type: string;
    payload: any;
    seq: number;
}

interface TraceEventRowProps {
    event: TraceEvent;
    isSelected: boolean;
    onSelect: () => void;
    traceId: string;
    scriptContent?: string;
}

export function TraceEventRow({ event, isSelected, onSelect, traceId, scriptContent }: TraceEventRowProps) {
    const { createBranch, isLoading } = useBranching();
    const [isForkOpen, setIsForkOpen] = useState(false);
    const [overrideJson, setOverrideJson] = useState(JSON.stringify(event.payload, null, 2));

    const handleFork = async () => {
        try {
            const payload = JSON.parse(overrideJson);
            await createBranch(traceId, event.seq, undefined, payload);
            setIsForkOpen(false);
        } catch (e) {
            alert("Invalid JSON format");
        }
    };

    return (
        <div
            onClick={onSelect}
            className={cn(
                "p-4 cursor-pointer transition-all hover:bg-white/[0.03] group flex items-start gap-4 relative pr-12",
                isSelected && "bg-brand/5 border-l-2 border-l-brand"
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
                    <span className="opacity-80 text-[10px] line-clamp-1">
                        {event.type === 'thought' ? event.payload.thought :
                            event.type === 'tool_call' ? event.payload.name :
                                event.type === 'tool_result' ? event.payload.tool_name :
                                    JSON.stringify(event.payload).slice(0, 100)}
                    </span>
                </div>
            </div>

            {/* Hover Action: Fork */}
            <Dialog open={isForkOpen} onOpenChange={setIsForkOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOverrideJson(JSON.stringify(event.payload, null, 2));
                            setIsForkOpen(true);
                        }}
                        disabled={isLoading}
                        title="Fork from here"
                    >
                        <GitFork className="h-3 w-3 text-muted-foreground hover:text-brand" />
                    </Button>
                </DialogTrigger>
                <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-[1000px] h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Fork Trace at Step {event.seq}</DialogTitle>
                        <DialogDescription>
                            Create a new branch from this point. You can override the event data below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 grid grid-cols-2 gap-4 py-4 min-h-0">
                        <div className="flex flex-col gap-2 h-full">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Source Script Context</label>
                            <div className="bg-muted/30 rounded-md border border-border p-2 flex-1 overflow-auto font-mono text-[10px] relative">
                                {scriptContent ? (
                                    <pre className="whitespace-pre-wrap">{scriptContent}</pre>
                                ) : (
                                    <div className="flex items-center justify-center h-full opacity-40 italic">
                                        Source code not available for this trace.
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 h-full">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Event Payload Override</label>
                            <Textarea
                                value={overrideJson}
                                onChange={(e) => setOverrideJson(e.target.value)}
                                className="font-mono text-xs flex-1 resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsForkOpen(false)}>Cancel</Button>
                        <Button onClick={handleFork} disabled={isLoading}>
                            {isLoading ? "Forking..." : "Fork & Run"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
