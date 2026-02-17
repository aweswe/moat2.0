import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ExecutionTimeline } from "./ExecutionTimeline";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-background">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-20 opacity-5"
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

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(var(--brand) / 0.08) 0%, transparent 70%)"
        }}
      />

      <div className="container relative z-10 pt-32 pb-40">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-[2px] border border-border bg-muted/50 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-slow shadow-[0_0_8px_hsl(var(--brand)/0.5)]" />
            <span className="text-[11px] font-mono font-bold tracking-[0.15em] text-brand uppercase">
              Core Infrastructure for Agents
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.02em] max-w-5xl mx-auto leading-[1.05] text-foreground"
        >
          Deterministic Observability{" "}
          <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-blue-400">for AI Agents</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mt-8 font-light"
        >
          Record, replay, rewind, and safely fix any AI agent execution — <span className="text-foreground font-normal">exactly as it happened.</span>
        </motion.p>

        {/* Explainer (Infra Style) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12 max-w-xl mx-auto"
        >
          <p className="text-sm text-muted-foreground font-mono leading-relaxed">
            AI agents are non-deterministic.
            <br />
            Logs can't reproduce failures.
            <br />
            <span className="text-foreground">AgentTrace records execution reality itself.</span>
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          <Link to="/signup">
            <Button variant="hero" size="xl">
              Record your first agent
            </Button>
          </Link>
          <Link to="/docs">
            <Button variant="heroOutline" size="xl">
              See how replay works
            </Button>
          </Link>
        </motion.div>

        {/* Timeline Visualization */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <ExecutionTimeline />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-xs font-mono">scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-4 h-6 rounded-sm border border-muted-foreground/30 flex items-start justify-center pt-1"
          >
            <div className="w-0.5 h-1.5 bg-muted-foreground/50 rounded-full" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
