import { motion } from "framer-motion";
import { Check, X, AlertTriangle, Minus } from "lucide-react";

const tableData = [
  {
    capability: "Primary role",
    agentTrace: "Execution determinism & replay",
    frameworks: "Build & orchestrate agents",
    promptTools: "Observe prompts & chains",
    logs: "Monitor errors",
    replayIo: "Debug app execution"
  },
  {
    capability: "Lifecycle stage",
    agentTrace: "Runtime (production)",
    frameworks: "Build-time / orchestration",
    promptTools: "Dev & eval",
    logs: "Production monitoring",
    replayIo: "Debugging"
  },
  {
    capability: "Where it sits",
    agentTrace: "Inside execution runtime",
    frameworks: "Above execution",
    promptTools: "Prompt layer",
    logs: "Outside application",
    replayIo: "App runtime"
  },
  {
    capability: "Deterministic replay",
    agentTrace: "Bit-perfect, guaranteed",
    frameworks: false,
    promptTools: false,
    logs: false,
    replayIo: "partial" // Special handling for warning
  },
  {
    capability: "Reproduce prod failures",
    agentTrace: "Yes",
    frameworks: false,
    promptTools: false,
    logs: false,
    replayIo: "limited"
  },
  {
    capability: "Time-travel debugging",
    agentTrace: "Native",
    frameworks: false,
    promptTools: false,
    logs: false,
    replayIo: true
  },
  {
    capability: "State rewind & restore",
    agentTrace: "Yes",
    frameworks: false,
    promptTools: false,
    logs: false,
    replayIo: "Limited"
  },
  {
    capability: "Branch / fork execution",
    agentTrace: "Built-in",
    frameworks: false,
    promptTools: false,
    logs: false,
    replayIo: "Manual"
  },
  {
    capability: "Safe replay (sandboxed)",
    agentTrace: "Yes",
    frameworks: false,
    promptTools: false,
    logs: false,
    replayIo: false
  },
  {
    capability: "LLM-aware execution",
    agentTrace: "Native",
    frameworks: "warning:Orchestration only",
    promptTools: "warning:Logging only",
    logs: false,
    replayIo: false
  },
  {
    capability: "Audit & compliance",
    agentTrace: "Execution ledger",
    frameworks: false,
    promptTools: "Logs",
    logs: "Logs",
    replayIo: false
  },
  {
    capability: "Relationship",
    agentTrace: "Foundational layer",
    frameworks: "Runs on top of AgentTrace",
    promptTools: "Complementary",
    logs: "Complementary",
    replayIo: "Adjacent"
  },
  {
    capability: "Category",
    agentTrace: "New infra layer",
    frameworks: "Agent frameworks",
    promptTools: "Dev tooling",
    logs: "Monitoring",
    replayIo: "Debugging"
  }
];

const RenderCell = ({ value, isBold = false }: { value: string | boolean; isBold?: boolean }) => {
  if (value === false) return <div className="flex justify-center"><X className="w-5 h-5 text-muted-foreground/30" /></div>;
  if (value === true) return <div className="flex justify-center"><Check className="w-5 h-5 text-foreground" /></div>;

  if (typeof value === 'string') {
    if (value.startsWith('warning:')) {
      return (
        <div className="flex items-center justify-center gap-2 text-warning">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium">{value.split(':')[1]}</span>
        </div>
      )
    }
    if (value === 'partial' || value === 'limited') {
      return (
        <div className="flex items-center justify-center gap-2 text-warning">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium capitalize">{value}</span>
        </div>
      )
    }
    return <span className={isBold ? "font-bold text-foreground text-sm" : "text-muted-foreground text-xs sm:text-sm"}>{value}</span>;
  }
  return <Minus className="w-4 h-4 text-muted-foreground/20" />;
};

export const ComparisonSection = () => {
  return (
    <section className="relative py-20 md:py-40 bg-background overflow-hidden">
      {/* Background Grids */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-20 opacity-5"
        style={{
          backgroundImage: `
              linear-gradient(currentColor 1px, transparent 1px),
              linear-gradient(90deg, currentColor 1px, transparent 1px)
           `,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
          color: 'var(--foreground)'
        }}
      />

      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-24">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Where AgentTrace fits
          </h2>
          <p className="text-muted-foreground">
            It's not a framework, prompt logger, or APM. It's the runtime layer they're missing.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 z-30 bg-card border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.1)] p-3 md:p-6 text-left text-xs md:text-sm font-mono text-muted-foreground/70 uppercase tracking-wider w-[120px] md:w-[200px]">Capability</th>
                <th className="p-3 md:p-6 text-center text-xs md:text-sm font-bold text-brand uppercase tracking-wider bg-brand/5 border-x border-brand/20 w-[160px] md:w-[240px]">AgentTrace</th>
                <th className="p-3 md:p-6 text-center text-xs md:text-sm font-mono text-muted-foreground/70 uppercase tracking-wider w-[140px] md:w-[200px]">Frameworks<br /><span className="text-[10px] opacity-60 normal-case hidden md:inline">(LangChain/LlamaIndex)</span></th>
                <th className="p-3 md:p-6 text-center text-xs md:text-sm font-mono text-muted-foreground/70 uppercase tracking-wider w-[130px] md:w-[180px]">Prompt Tools<br /><span className="text-[10px] opacity-60 normal-case hidden md:inline">(LangSmith)</span></th>
                <th className="p-3 md:p-6 text-center text-xs md:text-sm font-mono text-muted-foreground/70 uppercase tracking-wider w-[130px] md:w-[180px]">Logs / APM</th>
                <th className="p-3 md:p-6 text-center text-xs md:text-sm font-mono text-muted-foreground/70 uppercase tracking-wider w-[130px] md:w-[180px]">Replay.io</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tableData.map((row, i) => (
                <tr key={row.capability} className="group hover:bg-muted/30 transition-colors">
                  <td className="sticky left-0 z-20 bg-card border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.1)] group-hover:bg-muted/30 transition-colors p-3 md:p-6 text-xs md:text-sm font-medium text-foreground/80 whitespace-normal md:whitespace-nowrap">
                    {row.capability}
                  </td>
                  {/* AgentTrace Column - Highlighted */}
                  <td className="p-3 md:p-6 text-center bg-brand/[0.02] border-x border-brand/10 group-hover:bg-brand/[0.05] transition-colors relative">
                    <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-brand/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-brand/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <RenderCell value={row.agentTrace} isBold={true} />
                  </td>

                  <td className="p-3 md:p-6 text-center text-muted-foreground">
                    <RenderCell value={row.frameworks} />
                  </td>
                  <td className="p-3 md:p-6 text-center text-muted-foreground">
                    <RenderCell value={row.promptTools} />
                  </td>
                  <td className="p-3 md:p-6 text-center text-muted-foreground">
                    <RenderCell value={row.logs} />
                  </td>
                  <td className="p-3 md:p-6 text-center text-muted-foreground">
                    <RenderCell value={row.replayIo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
