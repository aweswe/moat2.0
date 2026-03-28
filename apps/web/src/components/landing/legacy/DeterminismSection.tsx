"use client";

import { motion } from "framer-motion";
import { GitBranch, Rewind, Shuffle, Clock, FolderOpen, MessageSquare } from "lucide-react";

const forkPoints = [
  {
    icon: Clock,
    label: "Time is frozen",
    description: "Every timestamp, timeout, and scheduled event is captured and replayed exactly. No drift. No 'it ran differently at 3am'.",
    tag: "sys.clock → pinned",
  },
  {
    icon: Shuffle,
    label: "Randomness is seeded",
    description: "UUIDs, sampling, randomness — all deterministic. Fork a run from step 12 and it behaves identically every time.",
    tag: "entropy → seeded",
  },
  {
    icon: MessageSquare,
    label: "LLM calls are cached",
    description: "Every model response is recorded. Replay uses the exact same tokens, in the exact same order. Zero extra cost.",
    tag: "llm.stream → cached",
  },
  {
    icon: FolderOpen,
    label: "I/O is virtualized",
    description: "File reads, writes, and external calls run in a copy-on-write sandbox. Your production system is never touched.",
    tag: "fs → sandboxed",
  },
];

export const DeterminismSection = () => {
  return (
    <section className="py-32 relative overflow-hidden bg-background">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container relative max-w-6xl mx-auto px-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted mb-6">
            <Rewind className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">How Forking Works</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Before you can fork a universe,<br />
            <span className="text-gradient-brand">you need to record it exactly.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A "what if" is only useful if the baseline is real. AgentTrace intercepts every source of
            non-determinism — clock, entropy, LLM tokens, I/O — so when you say{" "}
            <strong className="text-foreground">"fork from step 7"</strong>, it's actually step 7.
            Not a reconstruction. Not a guess.
          </p>
        </motion.div>

        {/* 4 interception cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {forkPoints.map((point, i) => (
            <motion.div
              key={point.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative h-full min-h-[280px] p-7 rounded-2xl bg-card border border-border hover:border-brand/40 flex flex-col transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--brand)/0.06)]"
            >
              {/* Tag */}
              <div className="mb-5">
                <span className="text-[10px] font-mono text-brand bg-brand/8 border border-brand/20 rounded-md px-2 py-0.5">
                  {point.tag}
                </span>
              </div>

              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-brand/10 transition-colors">
                <point.icon className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
              </div>

              <h3 className="font-bold text-lg text-foreground mb-3">{point.label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{point.description}</p>

              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Intercepted</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Code snapshot block — forced dark */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="rounded-2xl border border-white/10 bg-[#080810] shadow-2xl overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-white/[0.015]">
              <div className="flex items-center gap-4">
                <div className="flex gap-2 opacity-40">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                </div>
                <span className="font-mono text-xs text-white/40">agenttrace / snapshot @ T=3.30s</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-green-400 uppercase tracking-wider">Ready to Fork</span>
              </div>
            </div>

            {/* Code */}
            <div className="p-8 font-mono text-sm leading-loose text-white/80">
              <div className="space-y-2">
                <div className="text-white/30 text-xs mb-4">// Execution state pinned at step 7 → fork point</div>
                <div className="flex items-center gap-4 p-3 bg-white/[0.05] rounded-xl border border-white/8">
                  <span className="text-white/50">sys.clock()</span>
                  <span className="text-white/30">→</span>
                  <span className="text-white font-semibold">1706745600000</span>
                  <span className="ml-auto text-[10px] text-green-400 font-mono">pinned</span>
                </div>
                <div className="flex items-center gap-4 p-3 opacity-70">
                  <span className="text-white/50">entropy.source()</span>
                  <span className="text-white/30">→</span>
                  <span className="text-white/70">"a1b2c3d4-e5f6..."</span>
                  <span className="ml-auto text-[10px] text-green-400 font-mono">seeded</span>
                </div>
                <div className="flex items-center gap-4 p-3 opacity-70">
                  <span className="text-white/50">llm.call("gpt-4")</span>
                  <span className="text-white/30">→</span>
                  <span className="text-white/70">{"<cached 312 tokens>"}</span>
                  <span className="ml-auto text-[10px] text-green-400 font-mono">replayed</span>
                </div>
                <div className="flex items-center gap-4 p-3 opacity-70">
                  <span className="text-white/50">fs.read("config")</span>
                  <span className="text-white/30">→</span>
                  <span className="text-white/70">snapshot_v12</span>
                  <span className="ml-auto text-[10px] text-green-400 font-mono">sandboxed</span>
                </div>
                <div className="mt-6 pt-4 border-t border-white/8 flex items-center gap-3">
                  <GitBranch className="w-4 h-4 text-brand" />
                  <span className="text-white/90 font-semibold">
                    universe_a → forked from step 7{" "}
                    <span className="text-white/40 font-normal">// "what if the prompt was different?"</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
