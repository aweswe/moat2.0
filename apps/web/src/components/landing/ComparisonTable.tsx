import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonRow {
  feature: string;
  agentTrace: boolean;
  competitors: boolean[]; // Order: LangSmith, Braintrust, Arize
}

const COMPARISON_DATA: ComparisonRow[] = [
  { feature: "Deterministic Replay", agentTrace: true, competitors: [false, false, false] },
  { feature: "Event-Level Branching", agentTrace: true, competitors: [false, false, false] },
  { feature: "CLI-Based Replay", agentTrace: true, competitors: [false, false, false] },
  { feature: "Local-First Execution", agentTrace: true, competitors: [false, false, false] },
  { feature: "Open Trace Protocol", agentTrace: true, competitors: [false, false, false] },
  { feature: "State Injection", agentTrace: true, competitors: [false, false, false] },
];

/**
 * ComparisonTable — A strict, tabular ledger for competitive validation.
 * Uses system tokens for check/x marks. No marketing hype.
 */
export function ComparisonTable() {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-xs font-mono">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="px-6 py-4 text-left uppercase tracking-widest text-muted-foreground font-semibold">
              Capability_View
            </th>
            <th className="px-6 py-4 text-center uppercase tracking-widest text-accent font-bold bg-accent/5">
              AgentTrace
            </th>
            <th className="px-6 py-4 text-center uppercase tracking-widest text-muted-foreground font-normal">
              LangSmith
            </th>
            <th className="px-6 py-4 text-center uppercase tracking-widest text-muted-foreground font-normal">
              Braintrust
            </th>
            <th className="px-6 py-4 text-center uppercase tracking-widest text-muted-foreground font-normal">
              Arize
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {COMPARISON_DATA.map((row, idx) => (
            <tr key={idx} className="hover:bg-secondary/10 transition-colors">
              <td className="px-6 py-4 text-foreground font-medium border-r border-border">
                {row.feature}
              </td>
              <td className="px-6 py-4 text-center bg-accent/5 border-r border-border">
                <div className="flex justify-center">
                  <Check className="w-4 h-4 text-success" />
                </div>
              </td>
              {row.competitors.map((val, cIdx) => (
                <td key={cIdx} className="px-6 py-4 text-center border-r border-border last:border-0">
                   <div className="flex justify-center opacity-30">
                    {val ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
