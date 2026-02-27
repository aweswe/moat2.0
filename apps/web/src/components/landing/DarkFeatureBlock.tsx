"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Terminal, ShieldAlert } from "lucide-react";
import Image from "next/image";

export const DarkFeatureBlock = () => {
    return (
        <section className="relative py-32 sm:py-48 overflow-hidden">
            {/* Abstract dark textured background image generated earlier */}
            <div className="absolute inset-0 bg-black z-0">
                <Image
                    src="/_static/dark_failure_bg.png"
                    alt="Dark Abstract Background"
                    fill
                    className="object-cover opacity-80 mix-blend-screen"
                    priority={false}
                />
                {/* Fallback gradient if image doesn't load immediately or is missing from public dir */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f18] to-black opacity-90" />
            </div>

            <div className="container relative z-10 px-4">

                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 mb-4 backdrop-blur-md shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                    >
                        <ShieldAlert className="w-8 h-8 text-destructive" />
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white"
                    >
                        An agent booked 50 flights.<br />
                        <span className="text-white/40">You have no idea why.</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-white/60 font-light max-w-2xl mx-auto leading-relaxed"
                    >
                        Traditional logs only tell you <strong className="text-white font-medium">what</strong> happened. AgentTrace gives you the entire deterministic context to discover <strong className="text-white font-medium">why</strong>, immediately.
                    </motion.p>

                    {/* Minimal Error Terminal UI */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 40 }}
                        className="w-full max-w-3xl mx-auto mt-16 text-left"
                    >
                        <div className="rounded-xl overflow-hidden bg-[#0d131f]/80 backdrop-blur-xl border border-[#1f2937]/80 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] flex flex-col">
                            <div className="px-4 py-3 bg-black/40 border-b border-[#1f2937]/50 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-white/40" />
                                <span className="text-xs font-mono text-white/50 tracking-wider">production / worker-node-04</span>
                            </div>
                            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
                                <div className="text-white/40"><span className="text-white/20">14:02:01.32</span> [info] Connecting to travel API...</div>
                                <div className="text-white/40"><span className="text-white/20">14:02:01.45</span> [info] Received prompt: "Find flights to NYC"</div>
                                <div className="text-brand/80 mt-2 mb-2"><span className="text-white/20">14:02:02.10</span> [exec] Tool call triggered: book_flight(qty=50)</div>
                                <div className="text-destructive font-semibold bg-destructive/10 py-1 px-2 rounded border border-destructive/20 inline-flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Fatal Error: Billing limit exceeded on API key
                                </div>
                                <div className="text-white/40 mt-2"><span className="text-white/20">14:02:02.15</span> [warn] Agent loop forcefully terminated.</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
