import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CapabilityRowProps {
  icon: LucideIcon;
  label: string;
  description: string;
  className?: string;
}

/**
 * CapabilityRow — A single row in the capability matrix.
 * Factual, structured, no decorative cards.
 */
export function CapabilityRow({
  icon: Icon,
  label,
  description,
  className,
}: CapabilityRowProps) {
  return (
    <div className={cn(
      "flex items-center gap-6 py-6 border-b border-border last:border-0 group hover:bg-secondary/20 transition-colors px-2",
      className
    )}>
      <div className="w-10 h-10 border border-border flex items-center justify-center shrink-0 bg-secondary/30 group-hover:border-accent/30 transition-colors">
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-1">
          {label}
        </h3>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
