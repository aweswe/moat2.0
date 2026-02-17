import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function About() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-muted/30">
            <Header />

            <main className="pt-32 pb-24">
                <div className="container max-w-3xl mx-auto px-6">

                    {/* 1. Hero */}
                    <section className="mb-24">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight"
                        >
                            We’re building the execution layer <br className="hidden md:block" />
                            <span className="text-muted-foreground">AI agents are missing.</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl text-muted-foreground/80 leading-relaxed max-w-2xl"
                        >
                            AgentTrace exists because AI agents are non-deterministic — and non-determinism breaks trust in production.
                        </motion.p>
                    </section>

                    {/* 2. The Origin */}
                    <section className="mb-24">
                        <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground/50 uppercase mb-8 block">
                            The Origin
                        </span>
                        <h2 className="text-2xl font-semibold mb-6">The problem we kept running into</h2>
                        <div className="prose prose-invert prose-lg text-muted-foreground leading-relaxed">
                            <p className="mb-4">
                                We were building autonomous agents. They ran long, touched real systems, and inevitably failed in ways we couldn't predict.
                            </p>
                            <p className="mb-4">
                                When an agent failed, we tried to debug it. We looked at logs. We looked at prompt traces. We tried to "chat" with the debugger.
                            </p>
                            <p className="mb-4">
                                But we couldn't <em>reproduce</em> the failure. The external world had changed. The LLM output was slightly different. The state was gone. Debugging became guesswork.
                            </p>
                            <p className="font-medium text-foreground border-l-2 border-primary/50 pl-4 py-1 my-8">
                                “We didn’t lack observability. <br />
                                We lacked determinism.”
                            </p>
                        </div>
                    </section>

                    {/* 3. The Insight */}
                    <section className="mb-24">
                        <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground/50 uppercase mb-8 block">
                            The Insight
                        </span>
                        <h2 className="text-2xl font-semibold mb-6">Determinism is the missing layer</h2>
                        <div className="grid md:grid-cols-2 gap-8 text-muted-foreground">
                            <div>
                                <p className="mb-4">
                                    Traditional software assumes determinism. If you run the same code with the same input, you get the same output.
                                </p>
                                <p>
                                    AI agents break that assumption. They are probabilistic by nature. This makes them powerful, but it also makes them impossible to trust without a new kind of infrastructure.
                                </p>
                            </div>
                            <div>
                                <p className="mb-4">
                                    The solution isn’t better prompts or prettier dashboards.
                                </p>
                                <p>
                                    It’s controlling execution itself. We need to capture not just the logs, but the entire probabilistic state, so we can rewind and replay it exactly.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 4. What AgentTrace Is */}
                    <section className="mb-24 p-8 bg-muted/30 border border-border/50 rounded-2xl">
                        <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground/50 uppercase mb-4 block">
                            System Architecture
                        </span>
                        <p className="text-lg text-foreground leading-relaxed">
                            AgentTrace is <strong>deterministic observability infrastructure</strong> for AI agents.
                            We sit inside the execution runtime, intercept non-determinism (network calls, randomness, time), and make every run replayable, forkable, and auditable.
                        </p>
                    </section>

                    {/* 5. What We Believe */}
                    <section className="mb-24">
                        <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground/50 uppercase mb-8 block">
                            Our Principles
                        </span>
                        <ul className="space-y-6">
                            {[
                                "Execution must be reproducible.",
                                "Debugging should be non-linear (time-travel).",
                                "Safety is non-negotiable for autonomous systems.",
                                "Infrastructure should be boring and reliable.",
                                "Observability without control is incomplete."
                            ].map((principle, i) => (
                                <li key={i} className="flex items-start gap-4">
                                    <span className="font-mono text-xs text-muted-foreground/40 mt-1.5">0{i + 1}</span>
                                    <span className="text-lg text-foreground/90">{principle}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* 6. Who This Is For */}
                    <section className="mb-24 grid md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Who we’re building for</h3>
                            <ul className="space-y-2 text-muted-foreground">
                                <li>• Teams running autonomous agents in production</li>
                                <li>• Agents that touch APIs, files, money, or infrastructure</li>
                                <li>• Engineers who value correctness over hype</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4 opacity-50">Who we’re not for</h3>
                            <ul className="space-y-2 text-muted-foreground/50">
                                <li>• Pure prompt experimentation</li>
                                <li>• Simple conversational chatbots</li>
                                <li>• "Vibe checking" workflows</li>
                            </ul>
                        </div>
                    </section>

                    {/* 7. Team */}
                    <section className="mb-24 border-t border-border pt-12">
                        <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground/50 uppercase mb-8 block">
                            Team
                        </span>
                        <div className="flex items-start gap-4">
                            <div>
                                <h3 className="font-medium text-foreground">Ajay — Founder</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Building execution infrastructure for autonomous systems.
                                </p>
                                <div className="flex gap-4 mt-3">
                                    <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
                                    <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">LinkedIn</a>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 8. Why Now */}
                    <section className="mb-12">
                        <h2 className="text-3xl font-bold mb-4">Why now</h2>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                            Agents are moving into production. They’re handling real workflows. Non-determinism is no longer acceptable.
                        </p>
                        <p className="text-foreground font-medium">
                            Determinism is becoming a requirement, not a feature.
                        </p>
                    </section>

                </div>
            </main>
            <Footer />
        </div>
    );
}
