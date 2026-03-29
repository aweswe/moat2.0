"use client";

import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";

const sdks = [
    { name: "Python SDK", tag: "pip install agenttrace-py", status: "stable" },
    { name: "Node.js SDK", tag: "npm install agenttrace", status: "stable" },
    { name: "REST API", tag: "POST /api/trace/register", status: "stable" },
];

const compatRows = [
    {
        category: "LLM Providers",
        items: [
            { name: "OpenAI (raw SDK)", note: "streaming + tool calls" },
            { name: "Anthropic Claude", note: "streaming + tool calls" },
            { name: "Google Gemini", note: "streaming" },
            { name: "Groq / Mistral", note: "OpenAI-compatible" },
            { name: "Local / Ollama", note: "any HTTP endpoint" },
        ],
    },
    {
        category: "Agent Frameworks",
        items: [
            { name: "LangChain", note: "callbacks + chains" },
            { name: "LlamaIndex", note: "query pipelines" },
            { name: "AutoGen / CrewAI", note: "multi-agent" },
            { name: "Custom Python agents", note: "decorator-based" },
            { name: "Raw HTTP agents", note: "intercept at http layer" },
        ],
    },
    {
        category: "Runtime Coverage",
        items: [
            { name: "Streaming token flows", note: "captured token-by-token" },
            { name: "Nested tool calls", note: "full recursion tree" },
            { name: "Parallel tool execution", note: "async/await safe" },
            { name: "Multi-step reasoning", note: "CoT + ReAct loops" },
            { name: "State mutations", note: "memory / vector store writes" },
        ],
    },
    {
        category: "Infra Guarantees",
        items: [
            { name: "Sandboxed re-execution", note: "zero prod side-effects" },
            { name: "Signed trace storage", note: "Supabase Storage + RLS" },
            { name: "Org-level isolation", note: "strict RLS enforcement" },
            { name: "Immutable event ledger", note: "append-only, hash-verified" },
            { name: "RBAC (owner / dev / viewer)", note: "per-org permissions" },
        ],
    },
];

export const CompatibilitySection = () => {
    return (
        <section className="relative py-24 md:py-36 bg-background border-t border-border overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--brand) / 0.04) 0%, transparent 70%)" }}
            />

            <div className="container max-w-6xl mx-auto px-4 relative z-10">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-3xl mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted mb-6">
                        <Zap className="w-3.5 h-3.5 text-brand" />
                        <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Works With</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        Infra buyers ask: does it actually cover my stack?
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Short answer: yes. AgentTrace intercepts at the <strong className="text-foreground">execution layer</strong> —
                        below your framework, below your LLM client, at raw I/O.
                        If your agent runs Python or Node, it works. No framework lock-in.
                    </p>
                </motion.div>

                {/* SDK Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-wrap gap-3 mb-14"
                >
                    {sdks.map((sdk) => (
                        <div key={sdk.name} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <div>
                                <div className="text-sm font-semibold text-foreground">{sdk.name}</div>
                                <code className="text-xs font-mono text-muted-foreground">{sdk.tag}</code>
                            </div>
                            <span className="ml-2 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                                {sdk.status}
                            </span>
                        </div>
                    ))}
                </motion.div>

                {/* Compat grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {compatRows.map((row, ri) => (
                        <motion.div
                            key={row.category}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: ri * 0.08 }}
                            className="rounded-2xl border border-border bg-card/50 p-6"
                        >
                            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-brand mb-4">
                                {row.category}
                            </h3>
                            <div className="space-y-2.5">
                                {row.items.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                                        </div>
                                        <span className="text-[11px] font-mono text-muted-foreground">{item.note}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom guarantee bar */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-10 p-5 rounded-2xl border border-brand/20 bg-brand/4 flex flex-wrap gap-4 items-center justify-between"
                >
                    <div>
                        <p className="text-sm font-semibold text-foreground">Not seeing your stack?</p>
                        <p className="text-sm text-muted-foreground">
                            If it speaks HTTP and runs Python or Node, it works. Open an issue or ping us.
                        </p>
                    </div>
                    <a
                        href="https://github.com/aweswe/moat2.0/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono font-semibold text-brand border border-brand/30 px-4 py-2 rounded-xl hover:bg-brand/8 transition-colors shrink-0"
                    >
                        Request support →
                    </a>
                </motion.div>

            </div>
        </section>
    );
};
