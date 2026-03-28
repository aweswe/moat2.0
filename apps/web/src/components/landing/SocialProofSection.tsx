"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const TESTIMONIALS = [
  {
    quote: "I spent three days trying to figure out why our billing agent was creating duplicate charges. With AgentTrace, I replayed the exact session and saw the bug in under 10 minutes. It was a retry logic issue I would never have found otherwise.",
    name: "Siddharth Rao",
    role: "Senior Engineer, Fintech startup",
    avatar: "SR",
  },
  {
    quote: "We had an agent go rogue in staging and process the same customer requests 7 times. AgentTrace showed us exactly where the loop started — we fixed it before it ever touched production.",
    name: "Maria Chen",
    role: "AI Platform Lead",
    avatar: "MC",
  },
  {
    quote: "The branch-and-compare feature is genuinely game-changing. We use it to validate prompt changes before deploying. We found a regression in our summarization agent that would have cost us $2k/month in extra tokens.",
    name: "James Okonkwo",
    role: "ML Engineer",
    avatar: "JO",
  },
];

const STATS = [
  { value: "< 5ms", label: "overhead per traced event" },
  { value: "100%", label: "deterministic replay fidelity" },
  { value: "5 min", label: "median time to first insight" },
  { value: "3 LOC", label: "to instrument any Python agent" },
];

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

function TestimonialCard({ t, index }: { t: typeof TESTIMONIALS[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cardInView = useInView(cardRef as React.RefObject<Element>);

  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-2xl border border-border bg-card p-6 flex flex-col justify-between gap-5 transition-all duration-700",
        cardInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <blockquote className="text-sm text-muted-foreground leading-relaxed">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-foreground">
          {t.avatar}
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{t.name}</div>
          <div className="text-xs text-muted-foreground">{t.role}</div>
        </div>
      </div>
    </div>
  );
}

export function SocialProofSection() {
  const statsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef as React.RefObject<Element>);
  const titleInView = useInView(titleRef as React.RefObject<Element>);

  return (
    <section id="social-proof" className="py-32 bg-muted/20 border-t border-border">
      <div className="max-w-6xl mx-auto px-6 space-y-20">
        {/* Stats */}
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <div
              key={i}
              className={cn(
                "text-center transition-all duration-700",
                statsInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div
          ref={titleRef}
          className={cn(
            "transition-all duration-700",
            titleInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-[0.3em]">What teams say</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={i} t={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
