
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Book, Code, Terminal } from "lucide-react";

export default function Docs() {
    return (
        <div className="min-h-screen bg-background p-8">
            <header className="mb-12 flex items-center justify-between max-w-5xl mx-auto">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl font-bold font-mono">AgentTrace // Docs</h1>
                </div>
                <Button variant="outline" asChild><Link to="/signup">Get API Key</Link></Button>
            </header>

            <main className="max-w-3xl mx-auto space-y-12">
                <section className="space-y-4">
                    <h2 className="text-4xl font-bold tracking-tight">Integration Guide</h2>
                    <p className="text-xl text-muted-foreground">Three lines of code to deterministic consistency.</p>
                </section>

                <section className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                        <Terminal className="h-4 w-4" />
                        <span className="text-sm font-mono">Installation</span>
                    </div>
                    <pre className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <code>npm install @agenttrace/core</code>
                    </pre>
                </section>

                <section className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 border border-border rounded-xl hover:border-brand/50 transition-colors cursor-pointer group">
                        <Book className="h-8 w-8 text-brand mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold mb-2">Core Concepts</h3>
                        <p className="text-sm text-muted-foreground">Understanding determinism, traces, and time-travel.</p>
                    </div>
                    <div className="p-6 border border-border rounded-xl hover:border-brand/50 transition-colors cursor-pointer group">
                        <Code className="h-8 w-8 text-brand mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold mb-2">API Reference</h3>
                        <p className="text-sm text-muted-foreground">Full documentation for the Node.js and Python SDKs.</p>
                    </div>
                </section>
            </main>
        </div>
    );
}
