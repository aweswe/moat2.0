"use client";

import { motion } from "framer-motion";
import { TimeflowAnimation } from "./TimeflowAnimation";
import { useState } from "react";
import { GitBranch } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Record",
    tagline: "Capture reality",
    description: "One SDK call. Every tool invocation, LLM response, timestamp, and file read is recorded. Automatically. No code changes.",
    whatIf: null,
  },
  {
    number: "02",
    title: "Replay",
    tagline: "Rewind to the moment it broke",
    description: "Reproduce any prod failure with bit-perfect accuracy. Same inputs, same randomness, same LLM tokens — in a sandbox, not prod.",
    whatIf: null,
  },
  {
    number: "03",
    title: "Inspect",
    tagline: "Step through the decision tree",
    description: "Time-travel to any step. See exactly what the agent saw at that moment: the full context window, tool results, internal state.",
    whatIf: null,
  },
  {
    number: "04",
    title: "Fork",
    tagline: "What if it had done something different?",
    description: "Branch execution from any step. Swap a prompt, change a tool result, inject a different LLM response. Run it. See what the agent does in this new universe.",
    whatIf: "What if the agent had called tool B instead of tool A at step 4?",
  },
  {
    number: "05",
    title: "Multiverse",
    tagline: "Run every what-if in parallel",
    description: "Fork 10 branches at once. Each one a different hypothesis. Compare outcomes side-by-side. Ship the fix that actually works — verified, not guessed.",
    whatIf: "universe_a → original  /  universe_b → prompt v2  /  universe_c → tool patched",
  },
];

export const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="py-24 md:py-40 relative overflow-hidden bg-background scroll-mt-24">
      <div className="container relative">

        {/* Section Header */}
        <div className="max-w-2xl mb-20 px-4 md:px-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted mb-5">
            <GitBranch className="w-3.5 h-3.5 text-brand" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">How It Works</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            From crash to forked universe<br />
            <span className="text-muted-foreground font-normal">in under 60 seconds.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Most tools make you guess why your agent broke. AgentTrace shows you exactly —
            then lets you <strong className="text-foreground">rewrite the outcome.</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">

          {/* LEFT: Steps */}
          <div>
            <div className="space-y-10 relative">
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border hidden md:block" />

              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08 * i }}
                  animate={{ opacity: activeStep === i ? 1 : 0.35 }}
                  className="relative flex gap-7 group cursor-pointer"
                  onClick={() => setActiveStep(i)}
                >
                  {/* Number */}
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-card border flex items-center justify-center font-mono text-xs transition-all duration-300
                    ${activeStep === i ? "border-brand text-brand shadow-[0_0_12px_hsl(var(--brand)/0.25)]" : "border-border text-muted-foreground"}`}
                  >
                    {step.number}
                  </div>

                  {/* Text */}
                  <div className="pt-0.5 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold text-xl transition-colors duration-300 ${activeStep === i ? "text-foreground" : "text-foreground/70"}`}>
                        {step.title}
                      </h3>
                      {(step.number === "04" || step.number === "05") && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand/10 border border-brand/25 text-brand">
                          {step.number === "04" ? "FORK" : "MULTIVERSE"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">{step.tagline}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{step.description}</p>
                    {step.whatIf && activeStep === i && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 p-3 rounded-lg bg-brand/5 border border-brand/20 font-mono text-[11px] text-brand"
                      >
                        💭 {step.whatIf}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-14 pt-10 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground mb-5">
                After the first agent run you get:
              </h4>
              <div className="grid gap-3">
                {[
                  "A complete execution record — every step, every decision",
                  "One-click replay of any failure in a safe sandbox",
                  "Fork from any step to test your fix instantly",
                  "A multiverse view to compare outcomes side-by-side",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_6px_hsl(var(--brand)/0.5)] shrink-0" />
                    <span className="text-sm">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Animation */}
          <div className="lg:sticky lg:top-32">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <TimeflowAnimation onStepChange={setActiveStep} />
              <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest text-center mt-4">
                Live execution multiverse — fork at any node
              </p>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};
