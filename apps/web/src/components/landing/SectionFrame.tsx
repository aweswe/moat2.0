import React from "react";
import { cn } from "@/lib/utils";

interface SectionFrameProps {
  label: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * SectionFrame — The structural primitive for all homepage sections.
 * Enforces the label/heading/divider/content hierarchy.
 */
export function SectionFrame({
  label,
  title,
  children,
  className,
  id,
}: SectionFrameProps) {
  return (
    <section 
      id={id}
      className={cn("py-16 border-b border-border last:border-0", className)}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="space-y-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            {title}
          </h2>
        </div>
        
        <div className="border-t border-border pt-6 mt-4">
          {children}
        </div>
      </div>
    </section>
  );
}
