import { cn } from "@/lib/utils";

export type TraceStatus = "completed" | "ready" | "failed" | "running" | "queued";

const STATUS_CONFIG: Record<TraceStatus, { dot: string; text: string; label: string }> = {
    completed: { dot: "bg-success", text: "text-success", label: "completed" },
    ready:     { dot: "bg-success", text: "text-success", label: "ready" },
    failed:    { dot: "bg-destructive", text: "text-destructive", label: "failed" },
    running:   { dot: "bg-accent", text: "text-accent", label: "running" },
    queued:    { dot: "bg-muted-foreground", text: "text-muted-foreground", label: "queued" },
};

interface StatusProps {
    status: string | TraceStatus;
    className?: string;
}

export function StatusDot({ status, className }: StatusProps) {
    const config = STATUS_CONFIG[status as TraceStatus] || STATUS_CONFIG.queued;
    return (
        <span className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            config.dot,
            className
        )} />
    );
}

export function StatusText({ status, className }: StatusProps) {
    const config = STATUS_CONFIG[status as TraceStatus] || STATUS_CONFIG.queued;
    return (
        <span className={cn(
            "text-[10px] font-medium uppercase tracking-wider",
            config.text,
            className
        )}>
            {config.label}
        </span>
    );
}
