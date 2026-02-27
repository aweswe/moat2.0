"use client";

import { motion } from "framer-motion";
import { GitBranch, Play, RefreshCw, Shield, Link as LinkIcon, Lock, Code2 } from "lucide-react";

export const FeatureShowcase = () => {
    return (
        <section className="py-32 bg-background relative overflow-hidden">
            <div className="container px-4">

                {/* Feature 1: Deterministic Replay (Text Left, Image Right) */}
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24 mb-40">
                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold tracking-wide uppercase">
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Time Travel
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                            Replay any execution, <br className="hidden lg:block" />
                            with 100% precision.
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                            Don't guess what went wrong. AgentTrace intercepts all tool calls, LLM requests, and external state changes, allowing you to replay failed agents locally exactly as they ran in production.
                        </p>
                        <ul className="space-y-4 text-sm font-medium text-foreground pt-4">
                            <li className="flex items-center gap-3"><RefreshCw className="w-5 h-5 text-muted-foreground" /> No mocking required for replays.</li>
                            <li className="flex items-center gap-3"><Lock className="w-5 h-5 text-muted-foreground" /> Cryptographically verified states.</li>
                        </ul>
                    </div>

                    <div className="flex-1 w-full relative">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="relative aspect-square sm:aspect-video lg:aspect-square max-w-lg mx-auto"
                        >
                            {/* Abstract visual mockup for Replay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 to-transparent rounded-3xl border border-border/60 shadow-xl overflow-hidden glass flex flex-col items-center justify-center p-8">
                                <div className="w-full max-w-xs space-y-4">
                                    <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden relative">
                                        <div className="absolute left-0 top-0 bottom-0 bg-brand w-[60%]" />
                                        <div className="absolute left-[60%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-background border-2 border-brand rounded-full shadow-md" />
                                    </div>
                                    <div className="flex justify-between text-xs font-mono text-muted-foreground px-1">
                                        <span>00:00</span>
                                        <span className="text-foreground font-semibold">01:42</span>
                                        <span>02:15</span>
                                    </div>

                                    <div className="mt-8 bg-card border border-border/50 rounded-xl p-4 shadow-sm relative">
                                        <div className="absolute -top-3 left-4 bg-background border border-border/50 px-2 py-0.5 rounded text-[10px] font-semibold text-brand shadow-sm uppercase tracking-wider">
                                            Active State Snapshot
                                        </div>
                                        <pre className="text-xs font-mono text-foreground/80 pt-2">
                                            {`{
  "db_locked": true,
  "mem_usage": "142MB",
  "active_step": "eval_policy"
}`}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Feature 2: Branching (Image Left, Text Right) */}
                <div className="flex flex-col-reverse lg:flex-row items-center gap-16 lg:gap-24 mb-40">
                    <div className="flex-1 w-full relative">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="relative aspect-square sm:aspect-video lg:aspect-square max-w-lg mx-auto"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent rounded-3xl border border-border/60 shadow-xl overflow-hidden glass flex flex-col items-center justify-center p-8">
                                {/* Abstract visual mockup for Branching */}
                                <div className="relative w-64 h-64">
                                    {/* Central Line */}
                                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-border/40 rounded-full" />

                                    {/* Branch Line */}
                                    <svg className="absolute top-1/2 left-1/4 w-1/2 h-1/2 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <path d="M 50 0 C 50 50, 0 50, 0 100" fill="none" stroke="currentColor" strokeWidth="4" className="text-success/40" />
                                    </svg>

                                    {/* Nodes */}
                                    <motion.div
                                        className="absolute top-[10%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted border-2 border-border"
                                    />
                                    <motion.div
                                        className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-destructive border-2 border-background shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10 flex items-center justify-center"
                                    >
                                        <div className="w-1.5 h-1.5 bg-background rounded-full" />
                                    </motion.div>

                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.5, duration: 0.5 }}
                                        className="absolute bottom-[0%] left-1/4 -translate-x-1/2 translate-y-1/2 w-6 h-6 rounded-full bg-success border-2 border-background shadow-[0_0_20px_rgba(34,197,94,0.4)] z-20 flex items-center justify-center"
                                    >
                                        <GitBranch className="w-3 h-3 text-background absolute" />
                                    </motion.div>

                                    {/* Code patch bubble */}
                                    <motion.div
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="hidden sm:block absolute bottom-[20%] right-[10%] bg-card text-xs font-mono border border-border/50 p-2 rounded-lg shadow-lg whitespace-pre"
                                    >
                                        <span className="text-destructive">- policy_check()</span><br />
                                        <span className="text-success">+ await policy()</span>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold tracking-wide uppercase">
                            <GitBranch className="w-3.5 h-3.5" />
                            Fork & Fix
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                            Branch reality, <br className="hidden lg:block" />
                            test the fix instantly.
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                            Found the error? Fork the execution immediately before the crash. Inject your code fix or prompt adjustment, and the agent resumes exactly from that state. No setup required.
                        </p>
                        <ul className="space-y-4 text-sm font-medium text-foreground pt-4">
                            <li className="flex items-center gap-3"><Code2 className="w-5 h-5 text-muted-foreground relative"><span className="absolute inset-0 bg-muted/20 mix-blend-multiply" /></Code2> Hot-swap code during replay.</li>
                            <li className="flex items-center gap-3"><LinkIcon className="w-5 h-5 text-muted-foreground" /> Shareable sandbox URLs for the team.</li>
                        </ul>
                    </div>
                </div>

            </div>
        </section>
    );
};
