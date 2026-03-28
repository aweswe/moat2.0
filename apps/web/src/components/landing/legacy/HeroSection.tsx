"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Server, Code2, Database } from "lucide-react";
import Link from "next/link";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[100vh] flex flex-col items-center justify-start pt-32 lg:pt-40 overflow-hidden bg-background">
      {/* Background Gradients */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-brand/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      {/* Grid pattern (very subtle) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
               linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
               linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 20%, black 10%, transparent 100%)',
        }}
      />

      <div className="container relative z-10 flex flex-col items-center px-4">

        {/* Waitlist / Beta Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border/50 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-success opacity-80" />
            AgentTrace Beta is live
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center max-w-4xl tracking-tight text-foreground"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.04em' }}
        >
          One timeline, <br className="hidden sm:block" />
          <span className="text-muted-foreground">every agent execution.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-lg sm:text-xl text-muted-foreground max-w-2xl mt-6 leading-relaxed"
        >
          AgentTrace records every tool call, state change, and LLM decision. It intelligently builds a deterministic timeline you can replay and debug.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 lg:mt-10"
        >
          <Link href="/signup">
            <Button size="lg" className="h-12 px-8 rounded-full text-[15px] font-medium shadow-md shadow-primary/10 hover:shadow-lg transition-all">
              Start for free
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground sm:hidden mt-2">No credit card required.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="hidden sm:flex flex-col items-center gap-3 text-sm text-muted-foreground mt-8 p-4 rounded-xl bg-muted/20 border border-border/50"
        >
          <span className="font-semibold text-foreground/80">Built for modern AI stacks</span>
          <div className="flex flex-wrap justify-center items-center gap-4 text-foreground/70">
            <span className="flex items-center gap-1.5 bg-background shadow-sm px-2 py-1 rounded-md border border-border/60"><Code2 className="w-3.5 h-3.5" /> Python & TS</span>
            <span className="flex items-center gap-1.5 bg-background shadow-sm px-2 py-1 rounded-md border border-border/60"><Server className="w-3.5 h-3.5" /> LangChain</span>
            <span className="flex items-center gap-1.5 bg-background shadow-sm px-2 py-1 rounded-md border border-border/60"><Database className="w-3.5 h-3.5" /> OpenAI / Gemini</span>
            <span className="flex items-center gap-1.5 bg-background shadow-sm px-2 py-1 rounded-md border border-border/60"><img src="https://github.githubassets.com/favicons/favicon.svg" alt="GitHub" className="w-3.5 h-3.5 opacity-80" /> GitHub Actions</span>
          </div>
        </motion.div>

        {/* Floating Product Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring", stiffness: 50 }}
          className="w-full max-w-5xl mt-16 relative"
        >
          {/* Main App Window CSS Mockup */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-full rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden relative z-10"
            style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.05)' }}
          >
            {/* Fake Mac Header */}
            <div className="h-12 border-b border-border/40 bg-muted/30 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="mx-auto flex items-center px-4 md:px-32 py-1.5 rounded-md bg-background/50 border border-border/50 text-xs text-muted-foreground font-mono">
                <span className="opacity-50 mr-2">trace_id:</span> tr_9f82a1b...
              </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col md:flex-row min-h-[400px]">
              {/* Sidebar List */}
              <div className="hidden mt-4 md:flex w-64 border-r border-border/40 flex-col gap-2 p-4 pt-6 bg-muted/10">
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Recent Executions</div>
                {[
                  { name: "Support Triage", time: "2m", status: "success" },
                  { name: "Data Scraper", time: "14m", status: "error" },
                  { name: "Code Reviewer", time: "1h", status: "success" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-sm ${i === 0 ? 'bg-background shadow-sm border border-border/50' : 'hover:bg-muted/50 text-muted-foreground'}`}>
                    <span className={i === 0 ? 'font-medium text-foreground' : ''}>{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] opacity-60">{item.time}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-success' : 'bg-destructive'}`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline Main View */}
              <div className="flex-1 p-6 md:p-10 bg-background/30 flex flex-col gap-6">
                {/* Tool Call Bubble 1 */}
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center mt-1 border border-brand/20">
                    <Server className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-card rounded-xl border border-border/50 p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm text-foreground">fetch_user_tickets</div>
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">142ms</span>
                    </div>
                    <pre className="text-[11px] font-mono text-muted-foreground overflow-hidden">
                      {`{\n  "user_id": "usr_9921",\n  "status": "open"\n}`}
                    </pre>
                  </div>
                </div>

                {/* Tool Call Bubble 2 (Agent Decision) */}
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-1 border border-primary/20">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-card rounded-xl border border-border/50 p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm text-foreground flex items-center gap-2">
                        generate_reply
                        <span className="px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[10px] uppercase font-bold tracking-wider">LLM</span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">1.2s</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      "Based on the open tickets, I will draft a response explaining the current downtime and offering a credited extension..."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating Accents (Kinso style external badges) */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="hidden md:flex absolute -right-12 top-20 z-20 bg-card border border-border/50 shadow-xl rounded-xl p-3 items-center gap-3 backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <Play className="w-3 h-3 text-success fill-success ml-0.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Replay Ready</p>
              <p className="text-[10px] text-muted-foreground">Deterministic run</p>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="hidden md:flex absolute -left-8 bottom-24 z-20 bg-card border border-border/50 shadow-xl rounded-xl p-3 items-center gap-3 backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
              <Database className="w-3 h-3 text-brand" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">State Captured</p>
              <p className="text-[10px] text-muted-foreground">All DB mutations logged</p>
            </div>
          </motion.div>

        </motion.div>

      </div>
    </section>
  );
};
