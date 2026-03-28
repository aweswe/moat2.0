"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal } from "lucide-react";
import Link from "next/link";

export const FinalCTASection = () => {
    return (
        <section className="py-32 sm:py-40 bg-background relative overflow-hidden flex flex-col items-center justify-center">
            {/* Subtle radial glow */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, hsl(var(--brand) / 0.05) 0%, transparent 60%)" }}
            />

            <div className="container relative z-10 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6" style={{ lineHeight: 1.1 }}>
                        Stop guessing.<br />
                        <span className="text-muted-foreground font-semibold">Start debugging.</span>
                    </h2>

                    <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 mx-auto max-w-2xl">
                        AgentTrace takes 2 minutes to install. Stop digging through print logs and start seeing exactly what your AI is doing.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup">
                            <Button
                                size="lg"
                                className="h-14 px-10 text-base font-semibold rounded-full shadow-lg shadow-brand/10 hover:shadow-xl hover:shadow-brand/20 transition-all group"
                            >
                                Get Started for Free
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>

                        <Link href="/docs">
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-14 px-8 text-base font-medium rounded-full bg-transparent border-border/80 hover:bg-muted/50"
                            >
                                <Terminal className="mr-2 w-4 h-4" />
                                Read the docs
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
