import { motion } from "framer-motion";
import { TimeflowAnimation } from "./TimeflowAnimation";
import { useState } from "react";

const steps = [
  {
    number: "01",
    title: "Record",
    description: "Instrument execution. Capture time, randomness, and I/O automatically.",
  },
  {
    number: "02",
    title: "Replay",
    description: "Reproduce bugs with bit-perfect accuracy. Same inputs, same entropy.",
  },
  {
    number: "03",
    title: "Inspect",
    description: "Jump to any point. See exactly what the agent saw and decided.",
  },
  {
    number: "04",
    title: "Fork & Fix",
    description: "Branch from failure. Test fixes in isolation without touching production.",
  },
  {
    number: "05",
    title: "Ship",
    description: "Deploy knowing every failure is reproducible and verifiable.",
  },
];

export const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="py-24 md:py-40 relative overflow-hidden bg-background scroll-mt-24">
      <div className="container relative">

        {/* Section Header */}
        <div className="max-w-2xl mb-24 px-4 md:px-0">
          <span className="text-xs font-mono text-brand uppercase tracking-widest block mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-foreground">
            From crash to fix in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">

          {/* LEFT: Steps as Annotations */}
          <div>
            <div className="space-y-12 relative">
              {/* Vertical Line Guide */}
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border hidden md:block" />

              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  className="relative flex gap-8 group"
                  animate={{ opacity: activeStep === i ? 1 : 0.3 }} // Narrative Sync
                >
                  {/* Number Marker */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-card border flex items-center justify-center font-mono text-base transition-colors duration-500
                            ${activeStep === i ? "border-brand text-brand shadow-[0_0_10px_hsl(var(--brand)/0.3)]" : "border-border text-muted-foreground"}`}
                  >
                    {step.number}
                  </div>

                  {/* Text Content */}
                  <div className="pt-1.5">
                    <h3 className={`font-mono text-2xl mb-3 transition-colors duration-500 ${activeStep === i ? "text-brand" : "text-foreground"}`}>
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-base max-w-sm">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}

            </div>

            <div className="mt-16 pt-12 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">
                After the first agent run...
              </h4>
              <div className="grid gap-4">
                {[
                  "A trace is recorded automatically",
                  "Failures are replayable instantly",
                  "Fixes can be verified before shipping"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors duration-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_hsl(var(--brand)/0.5)]" />
                    <span className="text-sm font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: System Animation (Sticky) */}
          <div className="lg:sticky lg:top-32">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <TimeflowAnimation onStepChange={setActiveStep} />

              {/* Caption */}
              <div className="mt-4 text-center">
                <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest">
                  System Visualization
                </p>
              </div>
            </motion.div>
          </div>

        </div>

      </div>
    </section >
  );
};
