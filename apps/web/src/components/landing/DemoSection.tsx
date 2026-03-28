"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const STEPS = [
  {
    id: 1,
    label: "Agent starts",
    type: "SYSTEM",
    content: "Session 8821-4f2a initialized. Task: process Q1 refund batch.",
    detail: "AgentTrace begins recording. Every event from this point is captured — timestamps, context, state.",
    ms: "0ms",
  },
  {
    id: 2,
    label: "Agent thinks",
    type: "THINK",
    content: "212 refunds pending. Threshold: $500. Will auto-approve under threshold.",
    detail: "The model's internal reasoning is captured verbatim. You see exactly what it decided and why.",
    ms: "42ms",
  },
  {
    id: 3,
    label: "Tool called",
    type: "CALL",
    content: "payment.refund(id=9021, amount=340.00)",
    detail: "Every tool invocation is logged: function name, arguments, timing, and return value.",
    ms: "188ms",
  },
  {
    id: 4,
    label: "Tool returned",
    type: "RESP",
    content: "{ success: true, txn_id: 'TXN-441', balance_after: 0.00 }",
    detail: "The return value is captured exactly. This is what the agent used to make its next decision.",
    ms: "194ms",
  },
  {
    id: 5,
    label: "Anomaly detected",
    type: "WARN",
    content: "payment.refund(id=9021, amount=340.00) — DUPLICATE",
    detail: "AgentTrace detected that step 5 is identical to step 3. Network timeout caused a retry. The duplicate would have cost $340.",
    ms: "503ms",
    isAnomaly: true,
  },
  {
    id: 6,
    label: "Session saved",
    type: "DONE",
    content: "Session complete. 6 events. 1 anomaly. Replay available.",
    detail: "The entire session is saved with a permanent ID. Replay it anytime, on any machine, with exactly the same inputs.",
    ms: "504ms",
  },
];

const typeColors: Record<string, string> = {
  SYSTEM: "bg-muted text-muted-foreground",
  THINK:  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  CALL:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  RESP:   "bg-secondary text-secondary-foreground",
  WARN:   "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  DONE:   "bg-muted text-muted-foreground",
};

function useInView(ref: React.RefObject<Element | null>) {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.1 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return v;
}

export function DemoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>);
  const [active, setActive] = useState(0);

  return (
    <section id="demo" className="py-28 bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-8">
        <div className="mb-20">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-5">Live demo</p>
          <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] text-foreground max-w-lg">
            Click through an execution trace.
          </h2>
        </div>

        <div
          ref={ref}
          className={cn(
            "grid grid-cols-1 lg:grid-cols-5 gap-6 transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          )}
        >
          {/* Step list */}
          <div className="lg:col-span-2 flex flex-col gap-2">
            {STEPS.map((step, i) => (
              <button
                key={step.id}
                onClick={() => setActive(i)}
                className={cn(
                  "group text-left px-5 py-4 rounded-2xl border transition-all duration-200",
                  active === i
                    ? step.isAnomaly
                      ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40"
                      : "border-foreground/20 bg-card"
                    : "border-transparent hover:border-border hover:bg-background"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md",
                      typeColors[step.type]
                    )}>
                      {step.type}
                    </span>
                    <span className="text-sm font-medium text-foreground">{step.label}</span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", active === i && "rotate-90")} />
                </div>
                {active === i && (
                  <div className="mt-3 font-mono text-xs text-muted-foreground break-all">
                    {step.content}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3">
            <div className={cn(
              "h-full rounded-3xl border overflow-hidden transition-all duration-300",
              STEPS[active].isAnomaly ? "border-red-200 dark:border-red-900" : "border-border"
            )}>
              {/* Panel header */}
              <div className={cn(
                "px-6 py-4 border-b flex items-center justify-between",
                STEPS[active].isAnomaly ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30" : "border-border bg-muted/20"
              )}>
                <div className="flex items-center gap-3">
                  <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest", typeColors[STEPS[active].type])}>
                    {STEPS[active].type}
                  </span>
                  <span className="text-sm font-semibold text-foreground">Step {STEPS[active].id} of {STEPS.length}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{STEPS[active].ms}</span>
              </div>

              {/* Panel content */}
              <div className="p-6 bg-card min-h-[200px] lg:min-h-[300px] flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="font-mono text-sm inline-block w-full break-all text-foreground bg-muted/50 rounded-xl p-4 border border-border leading-relaxed">
                    {STEPS[active].content}
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">What this means</p>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {STEPS[active].detail}
                    </p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
                  <button
                    onClick={() => setActive(Math.max(0, active - 1))}
                    disabled={active === 0}
                    className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all duration-200",
                          active === i ? "bg-foreground w-4" : "bg-border hover:bg-muted-foreground"
                        )}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setActive(Math.min(STEPS.length - 1, active + 1))}
                    disabled={active === STEPS.length - 1}
                    className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
