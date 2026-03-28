"use client";

import React, { useEffect, useState } from "react";
import { SystemCard } from "@/components/system/SystemCard";
import { StatusDot } from "@/components/system/StatusSystem";
import { cn } from "@/lib/utils";

interface TraceEvent {
  id: string;
  index: number;
  type: "thought" | "tool_call" | "response" | "system";
  content: string;
  status: "completed" | "running" | "error" | "pending";
  timestamp: string;
}

const SAMPLE_EVENTS: TraceEvent[] = [
  { id: "1", index: 1, type: "system", status: "completed", content: "Observation protocol initialized.", timestamp: "00:00:01.002" },
  { id: "2", index: 2, type: "thought", status: "completed", content: "Analyzing request: 'Optimize database indexes for query performance.'", timestamp: "00:00:01.245" },
  { id: "3", index: 3, type: "tool_call", status: "completed", content: "call: db.explain_plan(query_id='q_8821')", timestamp: "00:00:01.890" },
  { id: "4", index: 4, type: "response", status: "completed", content: "Result: Full table scan detected on 'orders' table.", timestamp: "00:00:02.115" },
  { id: "5", index: 5, type: "thought", status: "completed", content: "Inefficient scan identified. Proposing composite index on (user_id, created_at).", timestamp: "00:00:02.400" },
  { id: "6", index: 6, type: "tool_call", status: "running", content: "call: db.create_index(table='orders', columns=['user_id', 'created_at'])", timestamp: "00:00:02.854" },
  { id: "7", index: 7, type: "system", status: "pending", content: "Waiting for write lock...", timestamp: "00:00:03.102" },
  { id: "8", index: 8, type: "system", status: "pending", content: "Finalizing execution trace.", timestamp: "00:00:03.450" },
];

/**
 * TraceTimeline — A simulated execution trace demonstration.
 * Animates events one by one to simulate a live system observation.
 */
export function TraceTimeline() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < SAMPLE_EVENTS.length) {
      const timer = setTimeout(() => {
        setVisibleCount((prev) => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [visibleCount]);

  return (
    <SystemCard className="bg-secondary/20 p-0 overflow-hidden border-border max-w-4xl mx-auto w-full">
      {/* Timeline Header */}
      <div className="border-b border-border bg-secondary/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-border" />
          </div>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
            System_Observer // Session_ID: 8821-4f2a
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-success uppercase tracking-widest">
            LIVE_RECORDING
          </span>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="divide-y divide-border font-mono text-xs max-h-[400px] overflow-auto">
        {SAMPLE_EVENTS.slice(0, visibleCount).map((event) => (
          <div 
            key={event.id}
            className="p-4 flex items-start gap-6 hover:bg-secondary/30 transition-colors animate-in fade-in slide-in-from-left-4 duration-500"
          >
            <div className="w-12 shrink-0 text-muted-foreground font-mono opacity-40">
              #{event.index.toString().padStart(3, '0')}
            </div>
            <div className="w-4 pt-1 flex justify-center shrink-0">
              <StatusDot status={event.status} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className={cn(
                  "uppercase tracking-widest font-semibold text-xs",
                  event.type === 'thought' ? "text-accent" :
                  event.type === 'tool_call' ? "text-success" :
                  event.type === 'response' ? "text-success" :
                  "text-muted-foreground"
                )}>
                  {event.type.replace('_', ' ')}
                </span>
                <span className="text-xs text-muted-foreground opacity-40">
                  {event.timestamp}
                </span>
              </div>
              <div className={cn(
                "font-medium tracking-tight",
                event.status === 'pending' ? "text-muted-foreground/40" : "text-foreground"
              )}>
                {event.content}
              </div>
            </div>
          </div>
        ))}
        {visibleCount < SAMPLE_EVENTS.length && (
          <div className="p-4 flex items-center gap-6 opacity-20">
             <div className="w-12 shrink-0 font-mono">
              #{(visibleCount + 1).toString().padStart(3, '0')}
            </div>
            <div className="w-4 h-4 rounded-full border border-border" />
            <div className="h-4 w-48 bg-border rounded-xl" />
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t border-border bg-secondary/30 px-6 py-2">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase tracking-widest">
          <span>Determinism_Confidence: 100%</span>
          <span>Buffer: 1.2MB/trace</span>
        </div>
      </div>
    </SystemCard>
  );
}
