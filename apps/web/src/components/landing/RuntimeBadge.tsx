import React from "react";
import { cn } from "@/lib/utils";

interface RuntimeBadgeProps {
  name: string;
  isComingSoon?: boolean;
}

/**
 * RuntimeBadge — A low-profile indicator for supported runtimes.
 * Monospace, bordered, lowercase.
 */
export function RuntimeBadge({ name, isComingSoon }: RuntimeBadgeProps) {
  return (
    <div className={cn(
      "px-3 py-1.5 border border-border bg-secondary/30 font-mono text-xs lowercase tracking-widest inline-flex items-center",
      isComingSoon ? "opacity-30 border-dashed" : "text-foreground"
    )}>
      {name}
      {isComingSoon && (
        <span className="ml-2 text-xs uppercase font-bold opacity-60">
          [Upcoming]
        </span>
      )}
    </div>
  );
}
