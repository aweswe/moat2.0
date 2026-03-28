"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const LOG_CHAOS = [
  "2024-03-14T09:21:03Z [INFO] Agent starting...",
  "2024-03-14T09:21:03Z [INFO] Fetching user context",
  "2024-03-14T09:21:04Z [DEBUG] HTTP GET /api/users/9021",
  "2024-03-14T09:21:04Z [INFO] User data loaded",
  "2024-03-14T09:21:05Z [INFO] Processing task",
  "2024-03-14T09:21:06Z [DEBUG] LLM call initiated",
  "2024-03-14T09:21:08Z [INFO] LLM response received",
  "2024-03-14T09:21:09Z [DEBUG] Tool call: get_balance",
  "2024-03-14T09:21:09Z [INFO] Balance: 1240.00",
  "2024-03-14T09:21:10Z [DEBUG] Tool call: apply_refund",
  "2024-03-14T09:21:11Z [INFO] Refund applied",
  "2024-03-14T09:21:11Z [DEBUG] Tool call: apply_refund",
  "2024-03-14T09:21:12Z [INFO] Refund applied",
  "2024-03-14T09:21:12Z [ERROR] Duplicate transaction detected",
  "2024-03-14T09:21:13Z [INFO] Agent completed",
  "2024-03-14T09:21:13Z [INFO] Exit: 0",
];

const TRACE_EVENTS = [
  { step: 1, type: "THINK", text: "Fetch user 9021 and check refund eligibility", ms: "12ms" },
  { step: 2, type: "CALL",  text: "get_user_context(id='9021')", ms: "89ms" },
  { step: 3, type: "THINK", text: "User eligible. Balance $1240. Proceed with refund.", ms: "6ms" },
  { step: 4, type: "CALL",  text: "apply_refund(amount=1240, user='9021')", ms: "210ms" },
  { step: 5, type: "CALL",  text: "apply_refund(amount=1240, user='9021') ⚠ DUPLICATE", ms: "195ms", error: true },
  { step: 6, type: "ERROR", text: "Duplicate TX: retry logic triggered on network timeout", ms: "—", error: true },
];

const typeColor: Record<string, string> = {
  THINK: "text-blue-500 dark:text-blue-400",
  CALL:  "text-emerald-600 dark:text-emerald-400",
  ERROR: "text-red-500 dark:text-red-400",
};
const typeBg: Record<string, string> = {
  THINK: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  CALL:  "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  ERROR: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400",
};

function useInView(ref: React.RefObject<Element | null>) {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.15 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return v;
}

export function ProblemSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef as React.RefObject<Element>);
  const [visibleTrace, setVisibleTrace] = useState<number[]>([]);

  useEffect(() => {
    if (!inView) return;
    TRACE_EVENTS.forEach((_, i) => {
      setTimeout(() => setVisibleTrace(p => [...p, i]), i * 300 + 600);
    });
  }, [inView]);

  return (
    <section id="problem" className="py-28 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-8">
        {/* Section eyebrow */}
        <div ref={sectionRef} className="mb-24 max-w-xl">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-5">The gap</p>
          <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] text-foreground">
            The bug is there.<br />
            <span className="text-muted-foreground">You just can&apos;t see it.</span>
          </h2>
        </div>

        {/* Split panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: chaos */}
          <div
            className={cn(
              "rounded-3xl border border-border bg-card overflow-hidden transition-all duration-700",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400/60" />
                <span className="w-3 h-3 rounded-full bg-amber-400/60" />
                <span className="w-3 h-3 rounded-full bg-green-400/60" />
              </div>
              <span className="text-xs font-mono text-red-500 font-medium">agent.log — no structured data</span>
            </div>
            <div className="p-5 font-mono text-[11px] leading-5 text-muted-foreground/60 h-[340px] overflow-hidden relative">
              {LOG_CHAOS.map((line, i) => (
                <div key={i} className={cn("truncate w-full", i === 13 && "text-red-500 font-semibold opacity-100")}>
                  {line}
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent" />
            </div>
            <div className="px-5 py-4 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground italic">→ The refund ran twice. Nobody knows why.</p>
            </div>
          </div>

          {/* Right: clarity */}
          <div
            className={cn(
              "rounded-3xl border border-border bg-card overflow-hidden transition-all duration-700 delay-200",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400/60" />
                <span className="w-3 h-3 rounded-full bg-amber-400/60" />
                <span className="w-3 h-3 rounded-full bg-green-400/60" />
              </div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">AgentTrace — full execution graph</span>
            </div>
            <div className="p-5 space-y-2 h-[340px] overflow-hidden">
              {TRACE_EVENTS.map((ev, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all duration-400",
                    ev.error ? "border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30" : "border-border bg-background",
                    visibleTrace.includes(i) ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                  )}
                >
                  <span className={cn("shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest", typeBg[ev.type])}>
                    {ev.type}
                  </span>
                  <span className={cn("flex-1 text-xs font-mono truncate", ev.error ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                    {ev.text}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">{ev.ms}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border bg-muted/20">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                → Step 5 = Step 4. Network timeout triggered a retry. $340 duplicate. Found in 30 seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
