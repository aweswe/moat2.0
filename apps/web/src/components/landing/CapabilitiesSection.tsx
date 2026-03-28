"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  {
    word: "Record",
    description: "Every prompt, tool call, and state change. Zero instrumentation noise. < 5ms overhead.",
    code: "@trace\nasync def my_agent(task):\n    return await run(task)",
  },
  {
    word: "Replay",
    description: "Deterministic re-execution on any machine. Same inputs. Same decisions. Same bug.",
    code: "agenttrace replay session-8821",
  },
  {
    word: "Branch",
    description: "Fork at any decision point. Test alternatives. Find regressions before users do.",
    code: "agenttrace fork session-8821 --from step-5",
  },
];

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

export function CapabilitiesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="features" className="py-28 bg-foreground text-background border-t border-border">
      <div className="max-w-7xl mx-auto px-8">
        <div className="mb-20">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-background/40 mb-5">Capabilities</p>
          <h2 className="text-3xl font-bold text-background/60 leading-tight max-w-sm">
            Three primitives.<br />Infinite insight.
          </h2>
        </div>

        <div ref={ref} className="space-y-0 divide-y divide-background/10">
          {CAPABILITIES.map((cap, i) => (
            <div
              key={i}
              className={cn(
                "group cursor-default py-10 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-16 transition-all duration-700",
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${i * 200}ms` }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Giant word */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-[clamp(48px,7vw,88px)] font-bold leading-none tracking-tight block transition-all duration-300",
                    hovered === i ? "text-background" : "text-background/30"
                  )}
                >
                  {cap.word}
                </span>
              </div>

              {/* Description */}
              <div
                className={cn(
                  "lg:w-[360px] space-y-3 transition-all duration-300",
                  hovered === i ? "opacity-100" : "opacity-100 lg:opacity-40"
                )}
              >
                <p className="text-background/80 text-base leading-relaxed">{cap.description}</p>
                <pre className="text-xs font-mono text-background/40 bg-background/5 rounded-xl px-4 py-3 border border-background/10">
                  {cap.code}
                </pre>
              </div>

              {/* Number */}
              <div
                className={cn(
                  "text-[80px] font-bold leading-none text-background/8 select-none lg:w-24 transition-all duration-300",
                  hovered === i && "text-background/15"
                )}
              >
                0{i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
