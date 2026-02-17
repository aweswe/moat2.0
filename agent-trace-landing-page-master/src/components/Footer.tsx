import { Button } from "@/components/ui/button";
import { Twitter, Github, Mail } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { MouseEvent } from "react";

export const Footer = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <footer className="py-20 border-t border-border bg-background">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-20">

          {/* Company Column */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">Company</h3>
            <a href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Press</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Partners</a>
          </div>

          {/* Product Column */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">Product</h3>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#capabilities" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Capabilities</a>
            <a href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</a>
            <a href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>

          {/* Compare Column */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-foreground">Compare</h3>
            <a href="/compare/agenttrace-vs-sentry" className="text-sm text-muted-foreground hover:text-foreground transition-colors">AgentTrace vs Sentry</a>
            <a href="/compare/agenttrace-vs-langsmith" className="text-sm text-muted-foreground hover:text-foreground transition-colors">AgentTrace vs LangSmith</a>
            <a href="/compare/agenttrace-vs-replay" className="text-sm text-muted-foreground hover:text-foreground transition-colors">AgentTrace vs Replay.io</a>
            <a href="/compare/agenttrace-vs-logs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">AgentTrace vs Logs</a>
            <a href="/compare" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium text-brand">Compare all →</a>
          </div>

          {/* Social / Legal */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-sm bg-primary/20 border border-primary/30 flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-sm" />
              </div>
              <span className="font-medium text-sm text-foreground">AgentTrace</span>
            </div>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground"><Github className="w-5 h-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground"><Mail className="w-5 h-5" /></a>
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-auto">
              © 2026 AgentTrace
            </p>
          </div>
        </div>

        {/* Massive Footer Text with Single-Layer Light Effect */}
        <div
          className="border-t border-border pt-8 pb-4 flex justify-center overflow-hidden relative group"
          onMouseMove={handleMouseMove}
        >
          <motion.h1
            className="text-[18vw] leading-[0.8] font-bold tracking-tighter text-center select-none pointer-events-none uppercase bg-center bg-no-repeat text-transparent pt-8 pb-4"
            style={{
              backgroundImage: useMotionTemplate`radial-gradient(circle 375px at ${mouseX}px ${mouseY}px, hsl(var(--foreground) / 0.9), hsl(var(--foreground) / 0.15))`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
            }}
          >
            agent trace
          </motion.h1>
        </div>
      </div>
    </footer>
  );
};
