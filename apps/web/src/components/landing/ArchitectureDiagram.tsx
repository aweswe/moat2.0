import React from "react";
import { SystemCard } from "@/components/system/SystemCard";
import { Activity, Database, RefreshCcw, GitBranch } from "lucide-react";

/**
 * ArchitectureDiagram — Displays the four-stage execution pipeline.
 * Built with pure CSS/HTML as per the execution plan. 
 * An anchored, precise technical visualization.
 */
export function ArchitectureDiagram() {
  const stages = [
    { icon: Activity, label: "01. Intercept", desc: "SDK captures low-level execution calls." },
    { icon: Database, label: "02. Record", desc: "Events stored in deterministic hash-ledger." },
    { icon: RefreshCcw, label: "03. Replay", desc: "Local engine recreates execution state." },
    { icon: GitBranch, label: "04. Branch", desc: "Fork execution at any event-point." },
  ];

  return (
    <SystemCard className="bg-background/40 border-border p-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
        {stages.map((stage, idx) => (
          <div key={idx} className="flex flex-col items-center text-center relative z-10 space-y-4">
            {/* Stage Icon Circle */}
            <div className="w-12 h-12 rounded-full border-2 border-border bg-background flex items-center justify-center text-muted-foreground group">
              <stage.icon className="w-5 h-5" />
            </div>
            
            {/* Connector Line (Desktop) */}
            {idx < stages.length - 1 && (
              <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-[1px] bg-border z-0" />
            )}
            
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-accent">
                {stage.label}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[140px] px-2">
                {stage.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Background Pipeline Path */}
      <div className="mt-12 pt-8 border-t border-border border-dashed flex items-center justify-center">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-[0.3em] opacity-40">
           Continuous_Observation_Loop // Protocol_v2.1
        </div>
      </div>
    </SystemCard>
  );
}
