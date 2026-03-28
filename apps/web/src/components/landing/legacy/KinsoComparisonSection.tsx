"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Terminal, Bug, Play, CheckCircle2, XCircle, Shield } from "lucide-react";

export const KinsoComparisonSection = () => {
    const [activeTab, setActiveTab] = useState<"before" | "after">("after");

    return (
        <section className="py-24 sm:py-32 bg-background relative overflow-hidden" id="compare">
            <div className="container px-4">

                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                        Why tracing beats logging
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Say goodbye to scattered terminal output and blind spots. AgentTrace gives you deterministic execution replay.
                    </p>
                </div>

                {/* Animated Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="relative flex items-center p-1.5 bg-muted/30 border border-border/50 rounded-full w-full max-w-md backdrop-blur-sm shadow-sm">
                        <button
                            onClick={() => setActiveTab("before")}
                            className={`relative z-10 font-semibold text-sm transition-colors py-3 w-1/2 rounded-full ${activeTab === "before" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Traditional Logging
                        </button>
                        <button
                            onClick={() => setActiveTab("after")}
                            className={`relative z-10 font-semibold text-sm transition-colors py-3 w-1/2 rounded-full ${activeTab === "after" ? "text-brand" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            With AgentTrace
                        </button>

                        {/* Animated pill background */}
                        <div className="absolute inset-y-1.5 left-1.5 right-1.5 pointer-events-none">
                            <motion.div
                                className="h-full w-1/2 rounded-full shadow-sm"
                                style={{
                                    backgroundColor: activeTab === 'after' ? 'hsl(var(--brand)/0.1)' : 'hsl(var(--card))',
                                    border: `1px solid ${activeTab === 'after' ? 'hsl(var(--brand)/0.2)' : 'hsl(var(--border)/0.8)'}`
                                }}
                                initial={false}
                                animate={{ x: activeTab === "before" ? "0%" : "100%" }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Comparison Window */}
                <div className="mx-auto max-w-5xl rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl shadow-xl overflow-hidden min-h-[500px] flex relative">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {activeTab === "before" ? (
                            <motion.div
                                key="before"
                                initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                                transition={{ duration: 0.4 }}
                                className="w-full h-full flex flex-col p-6 sm:p-10"
                            >
                                <div className="text-center mb-8">
                                    <div className="inline-flex p-3 rounded-full bg-destructive/10 text-destructive mb-4">
                                        <Bug className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground mb-2">The Blind Spot</h3>
                                    <p className="text-muted-foreground">Scattered terminal logs and zero state visibility.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3 text-muted-foreground">
                                            <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                            <p className="text-sm">Cannot reproduce exact agent state after failures.</p>
                                        </div>
                                        <div className="flex items-start gap-3 text-muted-foreground">
                                            <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                            <p className="text-sm">LLM inputs/outputs are truncated or lost in stdout.</p>
                                        </div>
                                        <div className="flex items-start gap-3 text-muted-foreground">
                                            <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                            <p className="text-sm">Tool side-effects mutate actual databases during debug.</p>
                                        </div>
                                    </div>

                                    {/* Fake Terminal UI */}
                                    <div className="rounded-lg bg-[#0d131f] border border-[#1f2937] p-4 font-mono text-xs overflow-hidden flex flex-col h-full min-h-[250px] shadow-inner opacity-80">
                                        <div className="text-white/30 truncate">12:00:15 INFO Agent started loop</div>
                                        <div className="text-white/30 truncate">12:00:16 INFO Calling specific tool...</div>
                                        <div className="text-white/30 truncate mt-2">12:00:18 ERROR Exception in LLM output parsing</div>
                                        <div className="text-destructive truncate">Traceback (most recent call last):</div>
                                        <div className="text-destructive/70 truncate pl-4">File "agent.py", line 42, in run</div>
                                        <div className="text-destructive truncate mt-2">KeyError: 'expected_format'</div>
                                        <div className="text-white/30 mt-4 italic">// Good luck reproducing exactly what the LLM returned to cause this //</div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="after"
                                initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                                transition={{ duration: 0.4 }}
                                className="w-full h-full flex flex-col p-6 sm:p-10"
                            >
                                <div className="text-center mb-8">
                                    <div className="inline-flex p-3 rounded-full bg-brand/10 text-brand mb-4 ring-4 ring-brand/5">
                                        <Play className="w-6 h-6 fill-brand ml-0.5" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground mb-2">Deterministic Multiverse</h3>
                                    <p className="text-muted-foreground">Perfect replay, isolated debugging, zero active mutations.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3 text-foreground">
                                            <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                            <p className="text-sm"><strong>100% Deterministic:</strong> Exact inputs yield exact outputs off the trace.</p>
                                        </div>
                                        <div className="flex items-start gap-3 text-foreground">
                                            <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                            <p className="text-sm"><strong>Zero-Risk Debugging:</strong> Database mutations are mocked during replay automatically.</p>
                                        </div>
                                        <div className="flex items-start gap-3 text-foreground">
                                            <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                                            <p className="text-sm"><strong>Hot Swapping:</strong> Branch off any node, tweak your prompt, and resume.</p>
                                        </div>
                                    </div>

                                    {/* Abstract AgentTrace UI snippet */}
                                    <div className="rounded-lg bg-background border border-border/60 p-4 font-sans text-xs flex flex-col gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full min-h-[250px] overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-2 text-[10px] font-bold text-success uppercase tracking-widest bg-success/10 rounded-bl-lg">
                                            Replay Mode
                                        </div>
                                        <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                            <span className="font-mono text-muted-foreground">tr_92xjf...</span>
                                            <span className="font-mono flex items-center gap-1"><Terminal className="w-3 h-3" /> Step 4/7</span>
                                        </div>

                                        <div className="flex gap-2 items-start mt-2">
                                            <div className="w-2 h-full bg-gradient-to-b from-brand to-transparent rounded-full flex-shrink-0" />
                                            <div className="flex flex-col gap-2 w-full">
                                                <div className="bg-muted/40 p-2 rounded-md border border-border/40">
                                                    <span className="text-[10px] text-muted-foreground font-semibold uppercase mb-1 block">Intercepted Call</span>
                                                    <code className="text-[11px] text-foreground font-mono font-medium">execute_sql_query("DROP TABLE users")</code>
                                                </div>
                                                <div className="bg-success/10 text-success p-2 rounded-md border border-success/20 flex flex-col">
                                                    <span className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Virtualized Engine Active</span>
                                                    <span className="text-xs mt-0.5">Database mutation prevented. Returned cached error state to agent for handling analysis.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </section>
    );
};
