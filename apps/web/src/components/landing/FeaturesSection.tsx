"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, RotateCcw, GitFork, SplitSquareVertical, Clock, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: Eye,
    title: "Full Execution Capture",
    description: "Every prompt, every tool call, every state mutation — captured with exact timestamps, input/output pairs, and token counts. Nothing is inferred. Nothing is reconstructed.",
    detail: "You'll see exactly what your agent saw, exactly what it decided, and exactly why.",
    tag: "Core",
  },
  {
    icon: RotateCcw,
    title: "Deterministic Replay",
    description: "Take any production session and replay it with identical starting state on your local machine. Same API responses, same random seeds, same decisions.",
    detail: "If it happened once, you can make it happen again. On demand. On any machine.",
    tag: "Core",
  },
  {
    icon: GitFork,
    title: "Execution Branching",
    description: "Fork execution at any decision point. Try a different prompt. Skip a tool call. Change a response. See how the trajectory changes — without touching production.",
    detail: "Like git branches, but for agent behavior.",
    tag: "Power",
  },
  {
    icon: SplitSquareVertical,
    title: "Side-by-Side Diff",
    description: "Compare any two sessions step by step. See exactly where the behavior diverged — which decision led to which outcome. Find regressions before users do.",
    detail: "Works across versions, environments, and prompt variants.",
    tag: "Power",
  },
  {
    icon: Clock,
    title: "Time-Travel Debugging",
    description: "Step forward and backward through any execution. Pause at any decision point. Inspect state. Understand context. Never read another stack trace in the dark.",
    detail: "A time machine for your AI agent.",
    tag: "Dashboard",
  },
  {
    icon: Shield,
    title: "Anomaly Detection",
    description: "AgentTrace watches for behavioral patterns that indicate something went wrong — unexpected tool call sequences, cost spikes, or deviation from known-good traces.",
    detail: "Get alerted before your users notice.",
    tag: "Dashboard",
  },
];

const TAG_STYLES: Record<string, string> = {
  Core: "bg-foreground text-background",
  Power: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Dashboard: "bg-secondary text-muted-foreground",
};

function useInView(ref: React.RefObject<Element | null>, threshold = 0.15) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>);
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={cn(
        "group relative rounded-2xl border border-border bg-card p-7 hover:border-foreground/20 transition-all duration-500 cursor-default",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${(index % 3) * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="p-2.5 rounded-xl bg-muted border border-border group-hover:bg-secondary transition-colors duration-300">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full", TAG_STYLES[feature.tag])}>
          {feature.tag}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">{feature.description}</p>
      
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-foreground/60 italic">{feature.detail}</p>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const titleRef = useRef<HTMLDivElement>(null);
  const inView = useInView(titleRef as React.RefObject<Element>);

  return (
    <section id="features" className="py-32 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        {/* Header */}
        <div
          ref={titleRef}
          className={cn(
            "max-w-2xl transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-[0.3em] mb-4">Capabilities</p>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Everything you need to understand
            <br />
            <span className="text-muted-foreground">what your agent did.</span>
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => <FeatureCard key={i} feature={f} index={i} />)}
        </div>
      </div>
    </section>
  );
}
