"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, GitBranch, BookOpen } from "lucide-react";
import Link from "next/link";

export const FinalCTASection = () => {
    return (
        <section className="py-32 bg-background relative overflow-hidden border-t border-border">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, hsl(var(--brand) / 0.07) 0%, transparent 70%)" }}
            />

            <div className="container relative z-10">
                <div className="max-w-4xl mx-auto text-center">

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/30 bg-brand/5 mb-8">
                            <GitBranch className="w-3.5 h-3.5 text-brand" />
                            <span className="text-xs font-semibold text-brand tracking-wide">Free to start · No credit card</span>
                        </div>

                        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6" style={{ lineHeight: 1.08 }}>
                            Your agent just crashed<br />
                            in production.<br />
                            <span className="text-gradient-brand">What if you could rewind it?</span>
                        </h2>

                        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
                            Add <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded border border-border">pip install agenttrace</code>,
                            run your agent, and get a full execution record.
                            Then fork it. Rewind it. Fix it. <strong className="text-foreground">Ship it.</strong>
                        </p>
                    </motion.div>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
                    >
                        <Link href="/signup">
                            <Button
                                size="lg"
                                className="h-13 px-8 text-base font-bold rounded-xl group"
                                style={{ boxShadow: "0 4px 28px hsl(var(--brand) / 0.3)" }}
                            >
                                Start Forking for Free
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>

                        <Link href="/docs">
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-13 px-8 text-base font-medium rounded-xl"
                            >
                                <BookOpen className="mr-2 w-4 h-4" />
                                5-minute quickstart
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Social proof / trust */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground"
                    >
                        {[
                            "Works with any LLM",
                            "Python + Node SDK",
                            "Framework-agnostic",
                            "RBAC for teams",
                        ].map((item) => (
                            <span key={item} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-brand/60" />
                                {item}
                            </span>
                        ))}
                    </motion.div>

                </div>
            </div>
        </section>
    );
};
