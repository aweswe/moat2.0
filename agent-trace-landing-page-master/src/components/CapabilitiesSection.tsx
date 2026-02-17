import { motion } from "framer-motion";
import {
  RotateCcw,
  Clock,
  Shield,
  FileText,
  Sparkles,
  ArrowRight
} from "lucide-react";

// Enterprise-Grade Copy
const capabilities = [
  {
    id: "core",
    label: "CORE PRIMITIVE",
    icon: RotateCcw,
    title: "Deterministic Replay",
    description: "Replay any agent execution with bit-perfect fidelity. Every LLM response, timestamp, random value, and side effect is reproduced exactly as recorded.",
    colSpan: "lg:col-span-2",
    isCore: true
  },
  {
    id: "control-1",
    label: "TEMPORAL CONTROL",
    icon: Clock,
    title: "Time-Travel Debugging",
    description: "Move freely backward and forward through execution. Jump to any step, inspect state, and fix issues at the source.",
    colSpan: "lg:col-span-2",
  },
  {
    id: "control-2",
    label: "SAFETY BOUNDARY",
    icon: Shield,
    title: "Sandboxed Execution",
    description: "Reproduce failures in complete isolation. No real API calls or database writes—your production environment remains untouched.",
    colSpan: "lg:col-span-2",
  },
  {
    id: "audit-1",
    label: "AUDIT LAYER",
    icon: FileText,
    title: "Execution Ledger",
    description: "An immutable, audit-grade record of every agent action. Full lineage from input to output, built for compliance and root-cause analysis.",
    colSpan: "lg:col-span-3",
  },
  {
    id: "intel-1",
    label: "INTELLIGENCE",
    icon: Sparkles,
    title: "Auto-Fix Insights",
    description: "Analyze real execution data to surface failure patterns. Understand why agents break—and how to prevent it before it ships.",
    colSpan: "lg:col-span-3",
  },
];

export const CapabilitiesSection = () => {
  return (
    <section id="capabilities" className="relative overflow-hidden bg-background py-24 md:py-40 scroll-mt-24">
      {/* 1. Background Overlay: Subtle 1px Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-20 opacity-5"
        style={{
          backgroundImage: `
                    linear-gradient(currentColor 1px, transparent 1px),
                    linear-gradient(90deg, currentColor 1px, transparent 1px)
                 `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
          color: 'var(--foreground)'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* 2. Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center mb-24"
        >
          <span className="block font-mono text-[11px] font-bold tracking-[0.16em] text-muted-foreground/60 mb-6 uppercase">
            &lt;System_Capabilities /&gt;
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Not features — <span className="text-muted-foreground/60">infrastructure.</span>
          </h2>
          <p className="text-xl text-muted-foreground/70 leading-relaxed font-light">
            The primitives required to run autonomous agents in production.
          </p>
        </motion.div>

        {/* 3. Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">

          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
              className={`group relative z-10 ${cap.colSpan}`}
            >
              <div
                className={`
                    h-full relative overflow-hidden transition-all duration-300
                    p-10 rounded-2xl
                    bg-card border
                    flex flex-col justify-between
                    border-border
                    ${cap.isCore
                    ? 'hover:border-brand/50 hover:shadow-[0_0_40px_rgba(70,130,180,0.1)]'
                    : 'hover:border-foreground/30'
                  }
                  `}
              >
                {/* Core Glow Effect */}
                {cap.isCore && (
                  <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand/10 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                )}

                {/* Scanline Hover Effect */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Content */}
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-8">
                    <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center 
                            transition-colors duration-300
                            ${cap.isCore ? 'bg-blue-950/40 text-brand' : 'bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background'}
                        `}>
                      <cap.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-brand">
                      {cap.label}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    {cap.title}
                  </h3>
                </div>

                {/* Description */}
                <div className="mt-4">
                  <p className="text-base text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
                    {cap.description}
                  </p>

                  {/* Learn More / Arrow (Subtle) */}
                  <div className="mt-8 pt-6 border-t border-border flex items-center gap-2 text-muted-foreground/50 group-hover:text-foreground transition-colors cursor-pointer">
                    <span className="text-xs font-mono tracking-widest uppercase">Explore</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
