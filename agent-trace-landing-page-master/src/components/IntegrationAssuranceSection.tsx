import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Layers, LogOut } from "lucide-react";

const assurances = [
    {
        icon: CheckCircle2,
        title: "No code rewrites",
        description: "Drop-in runtime instrumentation. Attach to your existing agent loop without refactoring logic.",
    },
    {
        icon: ShieldCheck,
        title: "No production mutation",
        description: "Sandboxed replay by default. Debugging happens in isolation, never touching live state.",
    },
    {
        icon: Layers,
        title: "Framework-agnostic",
        description: "Works with LangChain, LlamaIndex, custom Python agents, and internal enterprise stacks.",
    },
    {
        icon: LogOut,
        title: "Safe to remove",
        description: "No lock-in to execution flow. Detach the SDK anytime with zero residual impact.",
    },
];

export const IntegrationAssuranceSection = () => {
    return (
        <section className="py-24 bg-card/30 border-y border-border/50">
            <div className="container">

                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4">
                        Infrastructure-grade guarantees.
                    </h2>
                    <p className="text-muted-foreground">
                        Built for production environments where stability is non-negotiable.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {assurances.map((item, i) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="flex flex-col items-center text-center p-6 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                                <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground mb-2">
                                {item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    );
};
