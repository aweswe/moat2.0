import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useParams, Navigate, Link } from "react-router-dom";
import { Check, X, ArrowRight } from "lucide-react";
import { comparisons } from "@/data/comparisons";

export default function ComparePage() {
    const { slug } = useParams<{ slug: string }>();
    const data = slug ? comparisons[slug] : null;

    if (!data) {
        return <Navigate to="/compare" replace />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Header />
            <main className="flex-grow pt-32 pb-20">
                <div className="container max-w-4xl mx-auto px-4">

                    {/* Breadcrumb */}
                    <div className="mb-8 text-sm text-muted-foreground">
                        <Link to="/compare" className="hover:text-foreground transition-colors">Comparisons</Link>
                        <span className="mx-2">/</span>
                        <span className="text-foreground capitalize">{data.competitorName}</span>
                    </div>

                    {/* Hero */}
                    <div className="mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                            {data.title}
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground">
                            {data.subheadline}
                        </p>
                    </div>

                    {/* Section 1: What they are good at */}
                    <section className="mb-16 p-8 rounded-2xl bg-muted/30 border border-border/50">
                        <h2 className="text-xl font-semibold mb-6">{data.whatTheyAreGoodAt.title}</h2>
                        <ul className="space-y-3">
                            {data.whatTheyAreGoodAt.points.map((point, index) => (
                                <li key={index} className="flex items-start gap-3 text-muted-foreground">
                                    <div className="relative top-1.5 w-1.5 h-1.5 rounded-full bg-green-500/50 flex-shrink-0" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-6 text-sm text-muted-foreground italic">
                            This helps build trust — we know {data.competitorName} is a great tool.
                        </p>
                    </section>

                    {/* Section 2: Where it stops working */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-6">{data.whereTheyStop.title}</h2>
                        <ul className="grid gap-4">
                            {data.whereTheyStop.points.map((point, index) => (
                                <li key={index} className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                                    <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-foreground/90">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Section 3: The Core Difference (Table) */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-8">The Core Difference</h2>
                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="grid grid-cols-3 bg-muted/50 border-b border-border p-4 font-medium text-sm text-muted-foreground uppercase tracking-wider">
                                <div>Dimension</div>
                                <div className="text-center text-brand">AgentTrace</div>
                                <div className="text-center">{data.competitorName}</div>
                            </div>
                            <div className="divide-y divide-border">
                                {data.coreDifference.map((row, i) => (
                                    <div key={i} className="grid grid-cols-3 p-4 items-center">
                                        <div className="font-medium text-foreground">{row.dimension}</div>
                                        <div className="text-center flex justify-center text-sm">
                                            {row.agentTrace === true ? <Check className="w-5 h-5 text-brand" /> :
                                                row.agentTrace === false ? <X className="w-5 h-5 text-muted-foreground/30" /> :
                                                    <span className="font-semibold text-brand">{row.agentTrace}</span>}
                                        </div>
                                        <div className="text-center flex justify-center text-sm text-muted-foreground">
                                            {row.competitor === true ? <Check className="w-5 h-5 text-foreground" /> :
                                                row.competitor === false ? <X className="w-5 h-5 text-muted-foreground/30" /> :
                                                    <span>{row.competitor}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Section 4: When to use both */}
                    <section className="mb-16 p-8 rounded-2xl bg-brand/5 border border-brand/10">
                        <h2 className="text-lg font-semibold mb-3 text-foreground">When to use both</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            {data.whenToUseBoth}
                        </p>
                    </section>

                    {/* Section 5: CTA */}
                    <section className="text-center py-12 border-t border-border">
                        <h2 className="text-3xl font-bold mb-6">Make agent execution reproducible</h2>
                        <Button size="lg" className="rounded-full px-8 text-base">
                            Start with AgentTrace <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </section>

                </div>
            </main>
            <Footer />
        </div>
    );
}
