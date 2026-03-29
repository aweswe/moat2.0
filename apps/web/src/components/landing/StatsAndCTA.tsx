"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STATS = [
  { value: "< 5ms",  label: "overhead per event",         detail: "Non-blocking, async capture" },
  { value: "100%",   label: "replay fidelity",            detail: "Deterministic across environments" },
  { value: "5",      label: "lines to instrument",         detail: "One decorator on your agent function" },
];

function useInView(ref: React.RefObject<Element | null>, threshold = 0.1) {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return v;
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>);

  return (
    <section className="py-28 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-8">
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8"
        >
          {STATS.map((stat, i) => (
            <div
              key={i}
              className={cn(
                "transition-all duration-700",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              )}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="text-[clamp(52px,6vw,80px)] font-bold text-foreground leading-none mb-3">
                {stat.value}
              </div>
              <div className="text-base font-medium text-foreground mb-1">{stat.label}</div>
              <div className="text-sm text-muted-foreground">{stat.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>);

  return (
    <section id="pricing" className="py-32 bg-foreground text-background border-t border-border/10">
      <div
        ref={ref}
        className="max-w-5xl mx-auto px-8 text-center space-y-10"
      >
        <div
          className={cn(
            "transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          )}
        >
          <h2 className="text-5xl md:text-7xl font-bold text-background leading-[1.05] tracking-tight">
            Stop guessing.
            <br />
            <span className="text-background/40">Start knowing.</span>
          </h2>
        </div>

        <div
          className={cn(
            "transition-all duration-700 delay-200",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <p className="text-lg text-background/50 max-w-md mx-auto leading-relaxed">
            Free to start. No credit card. Works in 5 minutes.
          </p>
        </div>

        <div
          className={cn(
            "flex items-center justify-center gap-6 transition-all duration-700 delay-300",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <Link href="/signup">
            <button className="inline-flex items-center gap-2 px-10 py-4 bg-background text-foreground text-sm font-bold rounded-xl border border-transparent hover:bg-brand hover:text-brand-foreground hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
              Get started free
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link
            href="/docs"
            className="text-sm text-background/40 hover:text-background/70 transition-colors underline-offset-4 hover:underline"
          >
            Read the docs →
          </Link>
        </div>

        <div
          className={cn(
            "transition-all duration-700 delay-500",
            inView ? "opacity-100" : "opacity-0"
          )}
        >
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-background/20">
            AgentTrace · Built for AI engineering teams
          </p>
        </div>
      </div>
    </section>
  );
}
