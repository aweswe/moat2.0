"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { AgentTraceLogo } from "@/components/ui/logo";

export const ComparisonTableSection = () => {
    const comparisonData = [
        {
            feature: "Deterministic Replay",
            agentTrace: { text: "Yes", type: "check", highlight: true },
            langSmith: { text: "No", type: "cross", highlight: false },
            sentry: { text: "No", type: "cross", highlight: false },
            replayIo: { text: "Yes (Browser only)", type: "text", highlight: false },
        },
        {
            feature: "Execution Timeline",
            agentTrace: { text: "Full state & side-effects", type: "text", highlight: true },
            langSmith: { text: "Basic trace tree", type: "text", highlight: false },
            sentry: { text: "Error stack traces", type: "text", highlight: false },
            replayIo: { text: "Time travel debugger", type: "text", highlight: false },
        },
        {
            feature: "State Injection / Branching",
            agentTrace: { text: "Yes", type: "check", highlight: true },
            langSmith: { text: "No", type: "cross", highlight: false },
            sentry: { text: "No", type: "cross", highlight: false },
            replayIo: { text: "No", type: "cross", highlight: false },
        },
        {
            feature: "Target Workloads",
            agentTrace: { text: "Agentic AI / Python", type: "text", highlight: true },
            langSmith: { text: "LLM Apps", type: "text", highlight: false },
            sentry: { text: "General Web/Backend", type: "text", highlight: false },
            replayIo: { text: "Frontend JS", type: "text", highlight: false },
        },
        {
            feature: "Cost",
            agentTrace: { text: "Free & Open Source Core", type: "text", highlight: true },
            langSmith: { text: "Paid SaaS", type: "text", highlight: false },
            sentry: { text: "Paid SaaS", type: "text", highlight: false },
            replayIo: { text: "Paid SaaS", type: "text", highlight: false },
        },
        {
            feature: "Setup",
            agentTrace: { text: "pip install & 1 line of code", type: "text", highlight: true },
            langSmith: { text: "Requires API keys & wrappers", type: "text", highlight: false },
            sentry: { text: "SDK Integration", type: "text", highlight: false },
            replayIo: { text: "Custom Browser setup", type: "text", highlight: false },
        },
    ];

    return (
        <section className="py-24 sm:py-32 bg-background relative" id="comparison">
            <div className="container px-4 sm:px-6 mx-auto max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
                        AgentTrace — <span className="text-brand">Your Best Choice</span> for<br />
                        Debugging Complex Agents
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        See how we stack up against traditional logging and specialized tools.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="w-full overflow-x-auto rounded-2xl border border-border/50 bg-card shadow-xl shadow-brand/5"
                >
                    <div className="min-w-[800px]">
                        {/* Header Row */}
                        <div className="grid grid-cols-5 border-b border-border/50 bg-muted/20">
                            <div className="p-6 flex items-end">
                                <span className="font-semibold text-foreground">Features</span>
                            </div>

                            {/* AgentTrace Column Header (Highlighted) */}
                            <div className="p-4 sm:p-6 bg-brand/5 border-x border-brand/10 flex flex-col items-start justify-center gap-2">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-brand flex items-center justify-center shadow-md">
                                        <AgentTraceLogo size={20} className="text-white" />
                                    </div>
                                    <span className="font-bold text-base sm:text-lg text-foreground">AgentTrace</span>
                                </div>
                            </div>

                            {/* LangSmith Header */}
                            <div className="p-4 sm:p-6 flex flex-col items-start justify-center gap-2">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border flex items-center justify-center bg-white shadow-sm overflow-hidden">
                                        <span className="text-lg sm:text-2xl leading-none">🦜</span>
                                    </div>
                                    <span className="font-bold text-base sm:text-lg text-foreground">LangSmith</span>
                                </div>
                            </div>

                            {/* Sentry Header */}
                            <div className="p-4 sm:p-6 flex flex-col items-start justify-center gap-2">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#362D59] flex items-center justify-center shadow-sm">
                                        <svg viewBox="0 0 36 36" className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor">
                                            <path d="M17.842 4.414c.264-.424.896-.409 1.144.027l12.43 23.497c.231.437-.087.97-.573.97H5.975c-.482 0-.8-.523-.578-.954L17.842 4.414zM10.871 25.13h14.246l-7.11-13.435-7.136 13.435z" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-base sm:text-lg text-foreground">Sentry</span>
                                </div>
                            </div>

                            {/* Replay.io Header */}
                            <div className="p-4 sm:p-6 flex flex-col items-start justify-center gap-2">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg border border-border flex items-center justify-center bg-white shadow-sm overflow-hidden">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="5 3 19 12 5 21 5 3" className="fill-[#0066FF] text-[#0066FF] opacity-90" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-base sm:text-lg text-foreground">Replay.io</span>
                                </div>
                            </div>
                        </div>

                        {/* Data Rows */}
                        <div className="flex flex-col">
                            {comparisonData.map((row, index) => (
                                <div
                                    key={index}
                                    className={`grid grid-cols-5 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-transparent' : 'bg-muted/5'}`}
                                >
                                    {/* Feature Name */}
                                    <div className="p-6 flex items-center">
                                        <span className="font-medium text-foreground/90 text-sm sm:text-base">{row.feature}</span>
                                    </div>

                                    {/* AgentTrace (Highlighted) */}
                                    <div className="p-6 bg-brand/5 border-x border-brand/10 flex items-center">
                                        {row.agentTrace.type === "check" ? (
                                            <Check className="w-5 h-5 text-brand" />
                                        ) : (
                                            <span className="text-sm font-medium text-brand/90">{row.agentTrace.text}</span>
                                        )}
                                    </div>

                                    {/* LangSmith */}
                                    <div className="p-6 flex items-center">
                                        {row.langSmith.type === "cross" ? (
                                            <X className="w-4 h-4 text-destructive/50" />
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{row.langSmith.text}</span>
                                        )}
                                    </div>

                                    {/* Sentry */}
                                    <div className="p-6 flex items-center">
                                        {row.sentry.type === "cross" ? (
                                            <X className="w-4 h-4 text-destructive/50" />
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{row.sentry.text}</span>
                                        )}
                                    </div>

                                    {/* Replay.io */}
                                    <div className="p-6 flex items-center">
                                        {row.replayIo.type === "cross" ? (
                                            <X className="w-4 h-4 text-destructive/50" />
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{row.replayIo.text}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </motion.div>
            </div>
        </section>
    );
};
