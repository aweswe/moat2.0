import { motion } from "framer-motion";
import { Check } from "lucide-react";

const positioningData = [
  {
    category: "What it captures",
    logsApm: "Events, metrics",
    promptTools: "Prompts, responses",
    agentTrace: "Complete execution reality",
  },
  {
    category: "Reproduction",
    logsApm: "Manual correlation",
    promptTools: "Prompt replay only",
    agentTrace: "Bit-perfect deterministic",
  },
  {
    category: "Where it sits",
    logsApm: "Outside application",
    promptTools: "Prompt layer",
    agentTrace: "Inside execution runtime",
  },
  {
    category: "Debugging model",
    logsApm: "Search & filter",
    promptTools: "Compare prompts",
    agentTrace: "Time-travel, fork, fix",
  },
];

export const PositioningSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <span className="text-xs font-mono text-primary uppercase tracking-widest">
            Positioning
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold mt-4">
            A different layer entirely
          </h2>
          <p className="text-muted-foreground mt-4">
            AgentTrace sits inside execution — not above it.
          </p>
        </motion.div>

        {/* Positioning table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="rounded-lg border border-border bg-card overflow-x-auto relative">
            <table className="w-full min-w-[600px] md:min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="sticky left-0 z-30 bg-card border-r border-border p-4 text-left font-mono text-sm text-muted-foreground w-[140px] md:w-[200px] shadow-[4px_0_12px_rgba(0,0,0,0.1)]">

                  </th>
                  <th className="p-4 text-center font-mono text-sm text-muted-foreground">
                    Logs / APM
                  </th>
                  <th className="p-4 text-center font-mono text-sm text-muted-foreground">
                    Prompt Tools
                  </th>
                  <th className="p-4 text-center font-mono text-sm text-primary bg-primary/5">
                    AgentTrace
                  </th>
                </tr>
              </thead>
              <tbody>
                {positioningData.map((row) => (
                  <tr key={row.category} className="border-b border-border last:border-b-0 group hover:bg-muted/30">
                    <td className="sticky left-0 z-20 bg-card border-r border-border p-4 font-medium text-foreground w-[140px] md:w-[200px] shadow-[4px_0_12px_rgba(0,0,0,0.1)] group-hover:bg-muted/30 transition-colors whitespace-normal">
                      {row.category}
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {row.logsApm}
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {row.promptTools}
                    </td>
                    <td className="p-4 text-center text-primary bg-primary/5 font-medium relative group-hover:bg-primary/10 transition-colors">
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        {row.agentTrace}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
