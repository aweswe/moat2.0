"use client";

import { motion } from "framer-motion";
import { GitBranch, Rewind, Play, Shield, FileText, Layers, ArrowRight } from "lucide-react";

const capabilities = [
  {
    id: "fork",
    label: "CORE PRIMITIVE",
    icon: GitBranch,
    title: "Fork from Any Step",
    description: "The thing no other tool does. Pick any moment in your agent's execution — step 3 or step 47 — and branch reality from there. Change a prompt, swap a tool result, inject a different LLM response, and run the new universe. Your agent doesn't know it's in a fork.",
    colSpan: "lg:col-span-3",
    isCore: true,
  },
  {
    id: "multiverse",
    label: "MULTIVERSE",
    icon: Layers,
    title: "What If × N",
    description: "Don't just fork once. Run 10 parallel what-ifs simultaneously. Each branch is its own universe — different prompt, different model, different assumption. Compare outcomes. Ship the one that works.",
    colSpan: "lg:col-span-3",
    isCore: true,
  },
  {
    id: "replay",
    label: "DETERMINISTIC REPLAY",
    icon: Play,
    title: "Bit-Perfect Replay",
    description: "Rewind any production failure and re-run it exactly — same LLM tokens, same timestamps, same randomness. In a sandbox. Zero risk to prod.",
    colSpan: "lg:col-span-2",
  },
  {
    id: "timetravel",
    label: "TIME TRAVEL",
    icon: Rewind,
    title: "Rewind to Any Step",
    description: "Jump backward to the exact moment your agent went wrong. Inspect full state: context window, tool results, memory. Then fork from there.",
    colSpan: "lg:col-span-2",
  },
  {
    id: "sandbox",
    label: "SANDBOXED",
    icon: Shield,
    title: "Safe Re-execution",
    description: "Every replay and fork runs completely isolated. No real API calls. No database writes. Your production system is never touched.",
    colSpan: "lg:col-span-2",
  },
  {
    id: "audit",
    label: "AUDIT LAYER",
    icon: FileText,
    title: "Execution Ledger",
    description: "An immutable record of every agent action — every tool call, every LLM response, every decision. Built for compliance, root-cause analysis, and shipping with confidence.",
    colSpan: "lg:col-span-3",
  },
];

export const CapabilitiesSection = () => {
  return (
    <section id="capabilities" className="relative overflow-hidden bg-background py-24 md:py-40 scroll-mt-24">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(var(--brand) / 0.04) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted mb-6">
            <GitBranch className="w-3.5 h-3.5 text-brand" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Capabilities</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Not features.{" "}
            <span className="text-muted-foreground font-normal">Superpowers.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Every tool on this page existed to help you understand what happened.
            AgentTrace is the first one that lets you{" "}
            <strong className="text-foreground">change what happens next.</strong>
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-5">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.07 * i }}
              className={`group relative ${cap.colSpan}`}
            >
              <div className={`h-full relative overflow-hidden transition-all duration-300 p-8 rounded-2xl bg-card border flex flex-col
                ${cap.isCore
                  ? "border-brand/25 hover:border-brand/50 hover:shadow-[0_0_40px_hsl(var(--brand)/0.08)]"
                  : "border-border hover:border-foreground/20"
                }`}
              >
                {cap.isCore && (
                  <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-brand/8 blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                )}

                {/* Top */}
                <div className="flex justify-between items-start mb-7">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300
                    ${cap.isCore ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background"}`}
                  >
                    <cap.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-mono font-bold tracking-[0.18em] uppercase ${cap.isCore ? "text-brand" : "text-muted-foreground/60"}`}>
                    {cap.label}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-3">{cap.title}</h3>

                <p className="text-sm text-muted-foreground leading-relaxed flex-1 group-hover:text-foreground/80 transition-colors">
                  {cap.description}
                </p>

                <div className="mt-7 pt-5 border-t border-border flex items-center gap-2 text-muted-foreground/40 group-hover:text-foreground transition-colors cursor-pointer">
                  <span className="text-xs font-mono tracking-widest uppercase">Explore</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
