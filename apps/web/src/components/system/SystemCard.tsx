import { cn } from "@/lib/utils";
import React from "react";

interface SystemCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

/**
 * SystemCard: The canonical surface for AgentTrace.
 * 
 * CONTRACT:
 * - Surface: bg-card
 * - Border: border-border
 * - Radius: rounded-xl (12px)
 * - Padding: p-card-padding (16px)
 * 
 * className is restricted to LAYOUT ONLY (margin, width, height, flex, grid, visibility).
 * Visual overrides (background, border, padding, radius, color) are forbidden.
 */
export function SystemCard({ children, className, ...props }: SystemCardProps) {
    return (
        <div 
            className={cn(
                "bg-card border border-border rounded-xl p-card-padding transition-colors",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
