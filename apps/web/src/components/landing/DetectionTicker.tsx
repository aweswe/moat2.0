"use client";

import React from "react";

// Real-sounding, specific detections — NOT generic feature descriptions
const DETECTIONS = [
  { session: "agent-billing-prod-3",   event: "retry loop · step 12 of 12",      tag: "LOOP",       cost: "prevented $412 duplicate" },
  { session: "customer-service-7f2a",  event: "prompt injection at step 4",       tag: "SECURITY",   cost: "escalated to human" },
  { session: "order-fulfil-9c11",      event: "API rate limit at step 6, silent fail", tag: "FAILURE", cost: "48 orders not processed" },
  { session: "gpt-researcher-ab02",    event: "hallucinated tool args · run 3",   tag: "HALLUCINATE",cost: "wrong data written to DB" },
  { session: "invoice-agent-prod",     event: "infinite loop detected at step 8", tag: "LOOP",       cost: "terminated after 90s" },
  { session: "email-drafter-v2",       event: "context window overflow",          tag: "OVERFLOW",   cost: "response truncated, unsent" },
  { session: "report-agent-12f0",      event: "tool timeout · db.query()",        tag: "TIMEOUT",    cost: "fallback branch executed" },
  { session: "agent-billing-prod-4",   event: "retry loop · step 8 of 8",         tag: "LOOP",       cost: "prevented infinite loop" },
  { session: "customer-service-8x5b",  event: "prompt injection at step 2",       tag: "SECURITY",   cost: "escalated to human" },
  { session: "sync-worker-prod",       event: "API 500 at step 4",                tag: "FAILURE",    cost: "retried successfully" },
  { session: "seo-agent-live",         event: "hallucinated tool args · run 1",   tag: "HALLUCINATE",cost: "blocked by schema validation" },
  { session: "scraper-agent-v1",       event: "infinite loop detected at step 3", tag: "LOOP",       cost: "terminated after 20s" },
  { session: "summary-agent-9x",       event: "context window overflow",          tag: "OVERFLOW",   cost: "response truncated" },
  { session: "analysis-agent-beta",    event: "tool timeout · api.fetch()",       tag: "TIMEOUT",    cost: "fallback branch executed" },
];

const TAG_COLORS: Record<string, string> = {
  LOOP:       "text-amber-600 dark:text-amber-400",
  SECURITY:   "text-red-600 dark:text-red-400",
  FAILURE:    "text-red-500 dark:text-red-400",
  HALLUCINATE:"text-purple-600 dark:text-purple-400",
  OVERFLOW:   "text-orange-600 dark:text-orange-400",
  TIMEOUT:    "text-blue-600 dark:text-blue-400",
};

const TAG_BG: Record<string, string> = {
  LOOP:       "bg-amber-50 dark:bg-amber-950/40",
  SECURITY:   "bg-red-50 dark:bg-red-950/40",
  FAILURE:    "bg-red-50 dark:bg-red-950/40",
  HALLUCINATE:"bg-purple-50 dark:bg-purple-950/40",
  OVERFLOW:   "bg-orange-50 dark:bg-orange-950/40",
  TIMEOUT:    "bg-blue-50 dark:bg-blue-950/40",
};

function DetectionCard({ d }: { d: typeof DETECTIONS[0] }) {
  return (
    <div className="flex-shrink-0 flex items-start gap-4 w-[340px] rounded-2xl border border-border bg-card p-4 mx-3">
      <div className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold tracking-widest ${TAG_BG[d.tag]} ${TAG_COLORS[d.tag]}`}>
        {d.tag}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-mono text-muted-foreground truncate mb-1">{d.session}</p>
        <p className="text-sm text-foreground font-medium leading-snug mb-1">{d.event}</p>
        <p className="text-xs text-muted-foreground/60">{d.cost}</p>
      </div>
    </div>
  );
}

export function DetectionTicker() {
  return (
    <section className="py-24 border-t border-border overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto px-8 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Real-world examples</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          Based on real production patterns
        </div>
      </div>

      {/* Ticker rows */}
      <div className="space-y-3">
        {/* Row 1 — forward */}
        <div className="flex overflow-hidden">
          <div
            className="flex"
            style={{
              animation: "ticker-left 30s linear infinite",
              width: "max-content",
            }}
          >
            {[...DETECTIONS, ...DETECTIONS].map((d, i) => (
              <DetectionCard key={i} d={d} />
            ))}
          </div>
        </div>

        {/* Row 2 — reverse */}
        <div className="flex overflow-hidden">
          <div
            className="flex"
            style={{
              animation: "ticker-right 36s linear infinite",
              width: "max-content",
            }}
          >
            {[...DETECTIONS, ...DETECTIONS].slice(3).map((d, i) => (
              <DetectionCard key={i} d={d} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
