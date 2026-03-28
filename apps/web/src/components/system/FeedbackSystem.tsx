import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StateProps {
    message?: string;
    description?: string;
    className?: string;
}

export function LoadingState({ message = "Loading...", className }: StateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">{message}</p>
        </div>
    );
}

export function EmptyState({ 
    message = "No data found", 
    description = "There is nothing to display here yet.",
    className 
}: StateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/50 rounded-xl", className)}>
            <p className="text-sm font-medium text-foreground mb-1">{message}</p>
            <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                {description}
            </p>
        </div>
    );
}
