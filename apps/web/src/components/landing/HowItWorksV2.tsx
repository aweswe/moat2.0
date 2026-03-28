"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Install. One line.",
    description: "Add AgentTrace to your project with pip or npm. Zero config required.",
    code: `pip install agenttrace

# Python
from agenttrace import trace

@trace
async def my_agent(task: str):
    # your agent code here
    return await run_llm(task)`,
    lang: "python",
    callout: "Works with LangChain, AutoGen, CrewAI, custom agents",
  },
  {
    number: "02",
    title: "Run. We record everything.",
    description: "Every LLM call, every tool invocation, every state change — captured automatically with timestamps, inputs, outputs, and the full decision graph.",
    code: `# Run your agent normally
result = await my_agent("process orders")

# AgentTrace captures:
# ✓ All LLM prompts + responses
# ✓ Every tool call (name, args, return)
# ✓ Timing for each step
# ✓ State snapshots at each decision`,
    lang: "python",
    callout: "< 5ms overhead per trace event",
  },
  {
    number: "03",
    title: "Debug. Replay exactly.",
    description: "Open the trace in the dashboard. See every decision. Find the one that went wrong. Replay that exact session with the same state — locally, on any machine.",
    code: `# Replay any session
agenttrace replay session-8821-4f2a

# Or fork from a specific point
agenttrace fork session-8821-4f2a --from step-6

# Runs deterministically every time
# Same inputs → same outputs → same bug`,
    lang: "bash",
    callout: "100% deterministic replay across environments",
  },
];

function useInView(ref: React.RefObject<Element | null>, threshold = 0.2) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return inView;
}

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>);
  const [codeVisible, setCodeVisible] = useState(false);

  useEffect(() => {
    if (inView) setTimeout(() => setCodeVisible(true), 300 + index * 100);
  }, [inView, index]);

  return (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center transition-all duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
        index % 2 === 1 && "lg:grid-flow-dense"
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Text */}
      <div className={cn("space-y-4", index % 2 === 1 && "lg:col-start-2")}>
        <div className="flex items-center gap-3">
          <span className="text-5xl font-bold text-border select-none">{step.number}</span>
        </div>
        <h3 className="text-2xl font-bold text-foreground">{step.title}</h3>
        <p className="text-muted-foreground leading-relaxed text-base">{step.description}</p>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded-lg border border-border w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          {step.callout}
        </div>
      </div>

      {/* Code block */}
      <div
        className={cn(
          "rounded-2xl border border-border bg-card overflow-hidden transition-all duration-600",
          codeVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
          index % 2 === 1 && "lg:col-start-1"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-border" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{step.lang}</span>
        </div>
        <pre className="p-5 text-sm font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap">
          <code>{step.code}</code>
        </pre>
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  const titleRef = useRef<HTMLDivElement>(null);
  const inView = useInView(titleRef as React.RefObject<Element>);

  return (
    <section id="how-it-works" className="py-32 bg-muted/30 border-t border-border">
      <div className="max-w-6xl mx-auto px-6 space-y-24">
        {/* Header */}
        <div
          ref={titleRef}
          className={cn(
            "max-w-2xl transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-[0.3em] mb-4">How it works</p>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            From blind deployment
            <br />
            <span className="text-muted-foreground">to full visibility.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Three steps. No infrastructure changes. No rewriting your agent.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-24">
          {STEPS.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>

        {/* CTA bridge */}
        <div className={cn(
          "pt-8 border-t border-border flex items-center gap-3 text-muted-foreground transition-all duration-700 delay-300",
          inView ? "opacity-100" : "opacity-0"
        )}>
          <span className="text-sm">Then open the dashboard</span>
          <ArrowRight className="w-4 h-4" />
          <span className="text-sm font-medium text-foreground">See exactly what your agent did</span>
        </div>
      </div>
    </section>
  );
}
