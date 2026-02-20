"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, GitBranch, Play, Shield, Zap, Eye } from "lucide-react";
import Link from "next/link";
import { ExecutionTimeline } from "./ExecutionTimeline";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-background">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage: `
               linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
               linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 100%)',
        }}
      />

      {/* Brand glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% -10%, hsl(var(--brand) / 0.12) 0%, transparent 70%)"
        }}
      />

      <div className="container relative z-10 pt-32 pb-48">

        {/* Pill badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-brand/30 bg-brand/8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" style={{ boxShadow: '0 0 8px hsl(var(--brand) / 0.6)' }} />
            <span className="text-[12px] font-semibold tracking-wide text-brand">
              Deterministic AI Observability — Now in Beta
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center max-w-5xl mx-auto"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em' }}
        >
          Debug, Replay, and Fix<br />
          <span className="text-gradient-brand">Any AI Agent Execution</span>
        </motion.h1>

        {/* Subheadline — readable, human */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed"
          style={{ fontWeight: 400 }}
        >
          AgentTrace records every step your AI agent takes — tool calls, decisions, and outputs —
          then lets you <strong className="text-foreground font-semibold">replay any run exactly</strong>, branch from any point, and
          safely fix errors without re-running the world.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mt-8"
        >
          {[
            { icon: Eye, label: "Full Execution Traces" },
            { icon: Play, label: "Deterministic Replay" },
            { icon: GitBranch, label: "Branch at Any Step" },
            { icon: Shield, label: "Team RBAC" },
            { icon: Zap, label: "SDK + CLI" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-sm text-muted-foreground">
              <Icon className="w-3.5 h-3.5 text-brand" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          <Link href="/signup">
            <Button size="lg" className="group h-12 px-7 text-base font-semibold rounded-xl shadow-lg" style={{ boxShadow: '0 4px 24px hsl(var(--brand) / 0.3)' }}>
              Start for Free
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="outline" size="lg" className="h-12 px-7 text-base font-medium rounded-xl">
              <Play className="w-3.5 h-3.5 mr-2" />
              See Replay in Action
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-sm text-muted-foreground mt-4"
        >
          No credit card required · Python &amp; Node SDK · Works with any LLM
        </motion.p>

        {/* Timeline Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-20"
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
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs tracking-widest uppercase font-mono opacity-50">scroll</span>
          <div className="w-4 h-7 rounded-full border border-muted-foreground/30 flex items-start justify-center pt-1.5">
            <div className="w-0.5 h-2 bg-brand/60 rounded-full" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};
