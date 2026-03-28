"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

const TRACE_LINES = [
  { delay: 0,    type: "sys",   text: "Session initialized. Agent: gpt-4o. Task: process_refunds." },
  { delay: 400,  type: "think", text: "Analyzing request... 312 pending refunds found." },
  { delay: 900,  type: "tool",  text: "call: db.query('SELECT * FROM refunds WHERE status=pending')" },
  { delay: 1500, type: "out",   text: "→ returned 312 rows. Processing..." },
  { delay: 2100, type: "think", text: "Applying refund logic. Threshold: $500 auto-approve." },
  { delay: 2700, type: "tool",  text: "call: payment.refund(id=9921, amount=1200.00)" },
  { delay: 3200, type: "out",   text: "→ SUCCESS. Refunded $1,200 to customer #9921." },
  { delay: 3800, type: "tool",  text: "call: payment.refund(id=9922, amount=750.00)" },
  { delay: 4300, type: "out",   text: "→ SUCCESS. Refunded $750 to customer #9922." },
  { delay: 4900, type: "err",   text: "CRITICAL: Loop undetected. Processing same records again..." },
  { delay: 5400, type: "tool",  text: "call: payment.refund(id=9921, amount=1200.00)" },
  { delay: 5900, type: "out",   text: "→ SUCCESS. Refunded $1,200 to customer #9921. (DUPLICATE)" },
];

const colorMap: Record<string, string> = {
  sys:   "text-muted-foreground",
  think: "text-blue-500 dark:text-blue-400",
  tool:  "text-emerald-600 dark:text-emerald-400",
  out:   "text-foreground",
  err:   "text-red-600 dark:text-red-400 font-semibold",
};

const labelMap: Record<string, string> = {
  sys:   "INIT",
  think: "THINK",
  tool:  "CALL",
  out:   "RESP",
  err:   "ERROR",
};

const labelColorMap: Record<string, string> = {
  sys:   "bg-muted text-muted-foreground",
  think: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  tool:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  out:   "bg-secondary text-secondary-foreground",
  err:   "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export function HeroV2() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [cursor, setCursor] = useState(true);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const int = setInterval(() => setCursor(c => !c), 500);
    return () => clearInterval(int);
  }, []);

  const startAnimation = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    setVisibleLines([]);
    TRACE_LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisibleLines(prev => [...prev, i]);
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, line.delay);
      timeoutsRef.current.push(t);
    });
  };

  useEffect(() => {
    if (isPlaying) startAnimation();
    else {
      timeoutsRef.current.forEach(t => clearTimeout(t));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Auto-replay
  useEffect(() => {
    if (!isPlaying) return;
    const lastDelay = TRACE_LINES[TRACE_LINES.length - 1].delay;
    const replayTimer = setTimeout(() => {
      startAnimation();
    }, lastDelay + 2500);
    return () => clearTimeout(replayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLines.length === TRACE_LINES.length, isPlaying]);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-background">
      {/* Subtle grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px"
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Left: Message */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-mono text-muted-foreground tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Now in early access
          </div>

          <div className="space-y-5">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-foreground">
              Your AI agent
              <br />
              ran in production.
              <br />
              <span className="text-muted-foreground">What did it do?</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              AgentTrace records every decision, tool call, and state change your AI agent makes — so you can debug what went wrong, replay it exactly, and prove it won&apos;t happen again.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 dark:bg-foreground dark:text-background rounded-xl gap-2">
                Start recording free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="h-12 px-8 text-sm font-medium rounded-xl border-border hover:bg-secondary">
                See how it works
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            No credit card. 5 minutes to set up. Works with any Python or Node.js agent.
          </p>
        </div>

        {/* Right: Live trace terminal */}
        <div className="w-full rounded-2xl border border-border bg-card overflow-hidden shadow-xl dark:shadow-none">
          {/* Terminal bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <div className="w-3 h-3 rounded-full bg-green-400/70" />
              <span className="ml-3 text-xs font-mono text-muted-foreground">agenttrace — live session</span>
            </div>
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? "pause" : "replay"}
            </button>
          </div>

          {/* Trace lines */}
          <div
            ref={containerRef}
            className="h-[380px] overflow-y-auto p-4 space-y-2 font-mono text-xs scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {TRACE_LINES.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 transition-all duration-300",
                  visibleLines.includes(i) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
                )}
              >
                <span className={cn(
                  "inline-flex items-center shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest",
                  labelColorMap[line.type]
                )}>
                  {labelMap[line.type]}
                </span>
                <span className={cn("leading-relaxed", colorMap[line.type])}>
                  {line.text}
                </span>
              </div>
            ))}
            {isPlaying && visibleLines.length < TRACE_LINES.length && (
              <div className="flex items-center gap-3 opacity-50">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-bold tracking-widest">...</span>
                <span className="text-muted-foreground">
                  {cursor ? "█" : " "}
                </span>
              </div>
            )}
          </div>

          {/* Footer bar */}
          <div className="border-t border-border px-4 py-2.5 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                recording
              </span>
              <span>session: 8821-4f2a</span>
            </div>
            <span className="text-[10px] font-mono text-red-500 dark:text-red-400 font-semibold">
              {visibleLines.includes(10) ? "⚠ ANOMALY DETECTED" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
        <span className="text-xs font-mono uppercase tracking-widest opacity-50">scroll</span>
        <div className="w-px h-12 bg-border" />
      </div>
    </section>
  );
}
