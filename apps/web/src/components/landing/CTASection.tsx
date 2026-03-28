"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals exploring what went wrong.",
    features: [
      "5,000 trace events / month",
      "7-day trace retention",
      "1 agent project",
      "Local replay",
      "Dashboard access",
    ],
    cta: "Get started for free",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Team",
    price: "$49",
    period: "per month",
    description: "For teams running agents in production.",
    features: [
      "500,000 trace events / month",
      "90-day trace retention",
      "Unlimited projects",
      "Deterministic replay",
      "Execution branching",
      "Side-by-side diff",
      "Anomaly alerts",
      "SSO",
    ],
    cta: "Start 14-day trial",
    ctaVariant: "default" as const,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For teams with compliance, scale, or on-prem requirements.",
    features: [
      "Unlimited trace volume",
      "Unlimited retention",
      "On-premise deployment",
      "Custom integrations",
      "SLA guarantee",
      "Dedicated support",
    ],
    cta: "Talk to us",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
];

function useInView(ref: React.RefObject<Element | null>, threshold = 0.1) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

export function CTASection() {
  const gridRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(gridRef as React.RefObject<Element>);
  const titleInView = useInView(titleRef as React.RefObject<Element>);

  return (
    <section id="pricing" className="py-32 bg-background border-t border-border">
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        {/* Header */}
        <div
          ref={titleRef}
          className={cn(
            "text-center space-y-4 transition-all duration-700",
            titleInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-[0.3em]">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Start free. Scale when you need to.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No credit card required for the free tier. Cancel anytime.
          </p>
        </div>

        {/* Pricing grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl border p-7 flex flex-col gap-7 transition-all duration-700 relative",
                tier.highlighted
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card",
                gridInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              )}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background text-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-border">
                  Most popular
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-semibold uppercase tracking-wider opacity-60">{tier.name}</div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-sm opacity-60 mb-1">/ {tier.period}</span>
                </div>
                <p className={cn("text-sm leading-relaxed", tier.highlighted ? "opacity-70" : "text-muted-foreground")}>
                  {tier.description}
                </p>
              </div>

              <ul className="space-y-2.5 flex-1">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span className={tier.highlighted ? "opacity-80" : "text-muted-foreground"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href={tier.name === "Enterprise" ? "/contact" : "/signup"}>
                <Button
                  size="lg"
                  variant={tier.highlighted ? "secondary" : tier.ctaVariant}
                  className={cn(
                    "w-full h-11 text-sm font-semibold rounded-xl gap-2",
                    tier.highlighted && "bg-background text-foreground hover:bg-background/90"
                  )}
                >
                  {tier.cta}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom message */}
        <div className={cn(
          "text-center space-y-3 transition-all duration-700 delay-500",
          gridInView ? "opacity-100" : "opacity-0"
        )}>
          <p className="text-sm text-muted-foreground">
            All plans include unlimited team members. Trace event limits reset monthly.
          </p>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest opacity-40">
            AgentTrace // Built for AI engineering teams
          </p>
        </div>
      </div>
    </section>
  );
}
