"use client";

import { motion } from "framer-motion";
import { Check, X, AlertTriangle } from "lucide-react";
import { GitBranch } from "lucide-react";

// What AgentTrace actually does vs everything else
const rows = [
  {
    capability: "What you actually get",
    agentTrace: "Every step of every run, forever",
    frameworks: "Build plumbing, not visibility",
    langsmith: "Prompt logs (not execution)",
    sentry: "Error after the fact",
    replayio: "Frontend sessions only",
  },
  {
    capability: "When your agent misbehaves in prod",
    agentTrace: "Replay it exactly. Fork from the bug.",
    frameworks: "Hope the logs caught it",
    langsmith: "See the prompt. Not the cause.",
    sentry: "Stack trace. No context.",
    replayio: "Wrong runtime entirely",
  },
  {
    capability: "Fork from any step (What If?)",
    agentTrace: "Native. One click.",
    frameworks: false,
    langsmith: false,
    sentry: false,
    replayio: false,
  },
  {
    capability: "Multiverse branching",
    agentTrace: "Run 10 what-ifs in parallel",
    frameworks: false,
    langsmith: false,
    sentry: false,
    replayio: false,
  },
  {
    capability: "Deterministic replay",
    agentTrace: "Bit-perfect. Same LLM call, same output.",
    frameworks: false,
    langsmith: "warning:Evals only. Not replay.",
    sentry: false,
    replayio: "warning:Frontend only",
  },
  {
    capability: "Sandboxed re-execution",
    agentTrace: "No real API calls. Safe.",
    frameworks: false,
    langsmith: false,
    sentry: false,
    replayio: false,
  },
  {
    capability: "Root cause in seconds",
    agentTrace: "Jump to the exact step that broke",
    frameworks: false,
    langsmith: "warning:Guess from prompts",
    sentry: "warning:Guess from traces",
    replayio: false,
  },
  {
    capability: "Works with any LLM / agent",
    agentTrace: "Yes — framework-agnostic",
    frameworks: "warning:Locks you in",
    langsmith: "warning:LangChain-centric",
    sentry: true,
    replayio: false,
  },
];

const RenderCell = ({ value, bold = false }: { value: string | boolean; bold?: boolean }) => {
  if (value === false)
    return <div className="flex justify-center"><X className="w-4 h-4 text-muted-foreground/25" /></div>;
  if (value === true)
    return <div className="flex justify-center"><Check className="w-4 h-4 text-muted-foreground" /></div>;
  if (typeof value === "string" && value.startsWith("warning:")) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-amber-500">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs">{value.split(":")[1]}</span>
      </div>
    );
  }
  return (
    <span className={bold
      ? "text-sm font-semibold text-foreground"
      : "text-xs text-muted-foreground"
    }>{value as string}</span>
  );
};

export const ComparisonSection = () => {
  return (
    <section className="relative py-24 md:py-40 bg-background overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 100%, hsl(var(--brand) / 0.05) 0%, transparent 70%)"
        }}
      />

      <div className="container max-w-7xl mx-auto px-4 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/30 bg-brand/5 mb-6">
            <GitBranch className="w-3.5 h-3.5 text-brand" />
            <span className="text-xs font-semibold text-brand tracking-wide">Why AgentTrace?</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Everything else watches.<br />
            <span className="text-gradient-brand">AgentTrace lets you rewrite what happened.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Logs tell you <em>what</em> crashed. AgentTrace lets you go back to step 7,{" "}
            <strong className="text-foreground">fork a parallel universe</strong>, swap the prompt,
            and verify the fix—<em>without touching production.</em>
          </p>
        </motion.div>

        {/* Brutal fact strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16"
        >
          {[
            { stat: "0", label: "Other tools that let you fork an AI execution mid-run" },
            { stat: "∞", label: "Parallel what-if branches you can run simultaneously" },
            { stat: "< 60s", label: "From prod failure to forked, sandboxed debug session" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card/50 p-6 text-center">
              <div className="text-4xl font-black text-foreground mb-2 font-mono">{item.stat}</div>
              <p className="text-sm text-muted-foreground leading-snug">{item.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-x-auto"
        >
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 z-30 bg-card border-r border-border p-4 md:p-6 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px] md:w-[240px]">
                  Scenario
                </th>
                <th className="p-4 md:p-6 text-center text-xs font-bold text-brand uppercase tracking-wider bg-brand/5 border-x border-brand/20 w-[200px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    AgentTrace
                  </div>
                </th>
                <th className="p-4 md:p-6 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  LangChain / <br /><span className="opacity-60 normal-case text-[10px]">LlamaIndex</span>
                </th>
                <th className="p-4 md:p-6 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  LangSmith
                </th>
                <th className="p-4 md:p-6 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sentry / APM
                </th>
                <th className="p-4 md:p-6 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Replay.io
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.capability} className="group hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 z-20 bg-card border-r border-border group-hover:bg-muted/20 transition-colors p-4 md:p-6 text-sm font-medium text-foreground/80">
                    {row.capability}
                  </td>
                  <td className="p-4 md:p-6 text-center bg-brand/[0.03] border-x border-brand/10 group-hover:bg-brand/[0.07] transition-colors">
                    <RenderCell value={row.agentTrace} bold />
                  </td>
                  <td className="p-4 md:p-6 text-center"><RenderCell value={row.frameworks} /></td>
                  <td className="p-4 md:p-6 text-center"><RenderCell value={row.langsmith} /></td>
                  <td className="p-4 md:p-6 text-center"><RenderCell value={row.sentry} /></td>
                  <td className="p-4 md:p-6 text-center"><RenderCell value={row.replayio} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Bottom callout */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          AgentTrace doesn't replace your framework or logger. It's the <strong className="text-foreground">execution layer underneath</strong> — the one that finally lets you ask <em>"what if?"</em>
        </motion.p>

      </div>
    </section>
  );
};
