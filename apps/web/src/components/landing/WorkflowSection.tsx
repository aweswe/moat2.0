"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Ultra-short, cynical, specific pain points
const STEPS = [
  { n: "01", text: "Your agent runs in production." },
  { n: "02", text: "Something goes wrong." },
  { n: "03", text: "The logs say: Completed successfully." },
  { n: "04", text: "You add print statements." },
  { n: "05", text: "You redeploy." },
  { n: "06", text: "The bug doesn't happen." },
  { n: "07", text: "Three days later: customer complains." },
  { n: "08", text: "You still don't know why." },
  { n: "09", text: "You set up more logging and wait." },
];

function useInView(ref: React.RefObject<Element | null>) {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setV(true); },
      { threshold: 0.05 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return v;
}

export function WorkflowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>);
  const [revealed, setRevealed] = useState<number[]>([]);

  useEffect(() => {
    if (!inView) return;
    STEPS.forEach((_, i) => {
      setTimeout(() => setRevealed(p => [...p, i]), i * 120);
    });
  }, [inView]);

  return (
    <section className="py-28 bg-muted/20 border-t border-border">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">

          {/* Left: eyebrow + pivot */}
          <div className="lg:sticky lg:top-32">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-6">Sound familiar?</p>
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] text-foreground mb-8">
              The same loop.<br />
              <span className="text-muted-foreground">Every time.</span>
            </h2>
            <div className="pt-8 border-t border-border">
              <p className="text-muted-foreground text-base leading-relaxed mb-1">This is the default.</p>
              <p className="text-muted-foreground text-base leading-relaxed">It doesn&apos;t have to be.</p>
            </div>
          </div>

          {/* Right: numbered pain list */}
          <div ref={ref} className="space-y-0 border-t border-border">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-baseline gap-6 py-5 border-b border-border transition-all duration-500",
                  revealed.includes(i) ? "opacity-100" : "opacity-0 translate-y-2"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="text-xs font-mono text-muted-foreground/30 w-8 shrink-0">{step.n}</span>
                <span className={cn(
                  "text-lg font-medium",
                  i === 1 ? "text-foreground" :        // "Something goes wrong" — visible 
                  i === 2 ? "text-red-500 dark:text-red-400" : // logs lie — highlight
                  i === 7 ? "text-muted-foreground/50" : // resignation
                  i === 8 ? "text-muted-foreground/40" : // full give-up
                  "text-foreground"
                )}>
                  {step.text}
                </span>
              </div>
            ))}

            {/* The pivot */}
            <div
              className={cn(
                "pt-8 transition-all duration-700",
                revealed.length === STEPS.length ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
              style={{ transitionDelay: `${STEPS.length * 120 + 400}ms` }}
            >
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-foreground text-background text-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-background/40" />
                There&apos;s a better way.
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
