import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, X, AlertTriangle, ArrowRight } from "lucide-react";

export default function Compare() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Header />
            <main className="flex-grow pt-32 pb-20">
                <div className="container max-w-5xl mx-auto px-4">

                    {/* Hero */}
                    <div className="text-center mb-20">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                            AgentTrace Comparisons
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            How deterministic execution differs from today’s debugging and observability tools.
                        </p>
                    </div>

                    {/* Section 1: Category Framing */}
                    <div className="mb-20 text-center max-w-3xl mx-auto">
                        <div className="p-8 rounded-2xl bg-muted/30 border border-border">
                            <h2 className="text-2xl font-semibold mb-4">Not a replacement, but a new layer</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                AgentTrace is not a replacement for logging or prompt tooling.
                                It’s a new <strong>execution-level layer</strong> that makes AI agents reproducible.
                                While other tools monitor what happened, AgentTrace gives you the control to replay and fix it.
                            </p>
                        </div>
                    </div>

                    {/* Section 2: Comparison Grid */}
                    <div className="mb-20">
                        <h2 className="text-2xl font-bold mb-8 text-center">Quick Comparison</h2>
                        <div className="rounded-xl border border-border overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="p-4 font-medium text-muted-foreground">Tool</th>
                                        <th className="p-4 font-medium text-muted-foreground">Category</th>
                                        <th className="p-4 font-medium text-muted-foreground">Layer</th>
                                        <th className="p-4 font-medium text-center text-muted-foreground">Determinism</th>
                                        <th className="p-4 font-medium text-center text-muted-foreground">Replay</th>
                                        <th className="p-4 font-medium text-right text-muted-foreground"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <tr className="bg-brand/5">
                                        <td className="p-4 font-bold text-foreground">AgentTrace</td>
                                        <td className="p-4 text-sm">Execution control</td>
                                        <td className="p-4 text-sm">Runtime</td>
                                        <td className="p-4 text-center"><div className="flex justify-center"><Check className="w-5 h-5 text-brand" /></div></td>
                                        <td className="p-4 text-center"><div className="flex justify-center"><Check className="w-5 h-5 text-brand" /></div></td>
                                        <td className="p-4 text-right"></td>
                                    </tr>
                                    <tr className="hover:bg-muted/20 transition-colors">
                                        <td className="p-4 font-medium">Sentry</td>
                                        <td className="p-4 text-sm text-muted-foreground">Monitoring</td>
                                        <td className="p-4 text-sm text-muted-foreground">Outside app</td>
                                        <td className="p-4 text-center"><div className="flex justify-center"><X className="w-5 h-5 text-muted-foreground/30" /></div></td>
                                        <td className="p-4 text-center"><div className="flex justify-center"><X className="w-5 h-5 text-muted-foreground/30" /></div></td>
                                        <td className="p-4 text-right">
                                            <Link to="/compare/agenttrace-vs-sentry" className="text-sm font-medium text-brand hover:underline">Compare →</Link>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/20 transition-colors">
                                        <td className="p-4 font-medium">LangSmith</td>
                                        <td className="p-4 text-sm text-muted-foreground">Prompt observability</td>
                                        <td className="p-4 text-sm text-muted-foreground">Prompt layer</td>
                                        <td className="p-4 text-center"><div className="flex justify-center"><X className="w-5 h-5 text-muted-foreground/30" /></div></td>
                                        <td className="p-4 text-center"><div className="flex justify-center"><X className="w-5 h-5 text-muted-foreground/30" /></div></td>
                                        <td className="p-4 text-right">
                                            <Link to="/compare/agenttrace-vs-langsmith" className="text-sm font-medium text-brand hover:underline">Compare →</Link>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/20 transition-colors">
                                        <td className="p-4 font-medium">Replay.io</td>
                                        <td className="p-4 text-sm text-muted-foreground">App debugging</td>
                                        <td className="p-4 text-sm text-muted-foreground">App runtime</td>
                                        <td className="p-4 text-center"><div className="flex justify-center"><AlertTriangle className="w-5 h-5 text-yellow-500/70" /></div></td>
                                        <td className="p-4 text-center"><div className="flex justify-center"><AlertTriangle className="w-5 h-5 text-yellow-500/70" /></div></td>
                                        <td className="p-4 text-right">
                                            <Link to="/compare/agenttrace-vs-replay" className="text-sm font-medium text-brand hover:underline">Compare →</Link>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 3: Buyer Guidance */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-xl border border-border hover:border-brand/50 transition-colors cursor-pointer group">
                            <h3 className="text-lg font-semibold mb-2">Debugging Agents?</h3>
                            <p className="text-muted-foreground mb-4">See why traditional error monitoring isn't enough for non-deterministic AI.</p>
                            <Link to="/compare/agenttrace-vs-sentry" className="inline-flex items-center text-brand font-medium group-hover:translate-x-1 transition-transform">
                                AgentTrace vs Sentry <ArrowRight className="ml-2 w-4 h-4" />
                            </Link>
                        </div>
                        <div className="p-6 rounded-xl border border-border hover:border-brand/50 transition-colors cursor-pointer group">
                            <h3 className="text-lg font-semibold mb-2">Using LangChain?</h3>
                            <p className="text-muted-foreground mb-4">Understand the difference between prompt engineering validation and runtime execution control.</p>
                            <Link to="/compare/agenttrace-vs-langsmith" className="inline-flex items-center text-brand font-medium group-hover:translate-x-1 transition-transform">
                                AgentTrace vs LangSmith <ArrowRight className="ml-2 w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                </div>
            </main>
            <Footer />
        </div>
    );
}
