"use client";

import { motion } from "framer-motion";
import { GitBranch, AlertTriangle, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

const timeline = [
    {
        step: "01",
        time: "02:07 AM",
        label: "Agent starts checkout flow",
        detail: "Receives order #8821 — $249.00",
        type: "normal",
    },
    {
        step: "02",
        time: "02:07 AM",
        label: "Calls Stripe: create charge",
        detail: "stripe.charges.create({ amount: 24900 })",
        type: "normal",
    },
    {
        step: "03",
        time: "02:07 AM",
        label: "Stripe times out — 30s deadline hit",
        detail: "ReadTimeout: Connection timed out",
        type: "error",
    },
    {
        step: "04",
        time: "02:07 AM",
        label: "Agent retries. Calls Stripe again.",
        detail: "stripe.charges.create({ amount: 24900 })",
        type: "error",
    },
    {
        step: "05",
        time: "02:07 AM",
        label: "Both charges succeed",
        detail: "Customer charged $498.00. Support ticket incoming.",
        type: "critical",
    },
];

const recovery = [
    { icon: GitBranch, label: "Replay the exact run", detail: "Same timeout. Same retry. Same tokens. In a sandbox.", color: "text-brand" },
    { icon: Clock, label: "Fork at step 3", detail: 'Inject "timeout → idempotency key already exists" response.', color: "text-purple-500" },
    { icon: CheckCircle2, label: "Validate the fix", detail: "Agent retries. Single charge. No duplicate. Verified.", color: "text-green-500" },
];

export const FailureStorySection = () => {
    return (
        <section className="relative py-24 md:py-36 bg-background border-t border-border overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 50% at 80% 50%, hsl(0 84% 60% / 0.03) 0%, transparent 70%)" }}
            />

            <div className="container max-w-5xl mx-auto px-4 relative z-10">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-3xl mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/5 mb-6">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-semibold text-red-500 tracking-wide uppercase">Real Scenario</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        2AM. Your agent just charged a customer twice.
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Your logs show a timeout. Then a retry. Then two successful charges.
                        You have no idea <em>why</em> the retry fired — or how to safely test the fix
                        without touching production again.
                    </p>
                    <p className="text-lg font-semibold text-foreground mt-3">
                        With AgentTrace, you're in the forked sandbox in 60 seconds.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                    {/* LEFT: What happened without AgentTrace */}
                    <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="text-xs font-mono uppercase tracking-widest text-red-500 mb-5 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            What your logs tell you
                        </div>
                        <div className="rounded-2xl border border-red-500/20 bg-[#0d0608] overflow-hidden">
                            {/* Terminal header */}
                            <div className="px-5 py-3 border-b border-red-500/10 flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                </div>
                                <span className="font-mono text-xs text-white/30">agent.log — prod</span>
                            </div>
                            {/* Log lines */}
                            <div className="p-5 space-y-3 font-mono text-xs">
                                {timeline.map((item) => (
                                    <div key={item.step} className={`flex gap-3 items-start ${item.type === "critical" ? "text-red-400" :
                                            item.type === "error" ? "text-amber-400" : "text-white/50"
                                        }`}>
                                        <span className="text-white/20 shrink-0 tabular-nums">{item.time}</span>
                                        <div>
                                            <div className="font-medium">{item.label}</div>
                                            <div className={`text-[10px] mt-0.5 ${item.type === "critical" ? "text-red-400/70" :
                                                    item.type === "error" ? "text-amber-400/60" : "text-white/30"
                                                }`}>{item.detail}</div>
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-3 border-t border-white/5 text-white/20">
                                    {"// That's all you get. Good luck."}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT: With AgentTrace */}
                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="text-xs font-mono uppercase tracking-widest text-green-500 mb-5 flex items-center gap-2">
                            <GitBranch className="w-3.5 h-3.5" />
                            What AgentTrace gives you
                        </div>

                        {/* Steps */}
                        <div className="space-y-4 mb-6">
                            {recovery.map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card/50">
                                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                        <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-foreground mb-1">{item.label}</div>
                                        <div className="text-sm text-muted-foreground">{item.detail}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* What-if callout */}
                        <div className="rounded-2xl border border-brand/25 bg-brand/5 p-5">
                            <div className="flex items-start gap-3">
                                <GitBranch className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground mb-1">
                                        Fork at step 3 → "What if the timeout returned an idempotency error?"
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Your agent re-runs in the forked universe. One charge. Problem confirmed, fix verified.
                                        Deploy with confidence. No prod touch required.
                                    </p>
                                    <div className="mt-3 font-mono text-[11px] text-brand/80 bg-brand/5 rounded-lg px-3 py-2 border border-brand/15">
                                        universe_a → original (2 charges) &nbsp;|&nbsp; universe_b → patched (1 charge ✓)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom CTA bar */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl border border-border bg-card/50"
                >
                    <div>
                        <p className="font-bold text-foreground">
                            Every serious agent in production will need this layer.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Not a nice-to-have. The required reliability primitive for AI infrastructure.
                        </p>
                    </div>
                    <Link
                        href="/signup"
                        className="flex items-center gap-2 shrink-0 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-bold hover:bg-foreground/90 transition-colors"
                    >
                        Start Forking for Free
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>

            </div>
        </section>
    );
};
