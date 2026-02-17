import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";

export const FinalCTASection = () => {
    return (
        <section className="py-32 bg-background relative overflow-hidden border-t border-border">
            {/* Background Ambience - Subtle Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand/5 pointer-events-none" />

            <div className="container relative z-10">
                <div className="max-w-4xl mx-auto text-center">

                    {/* Main Copy */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
                            Ready to make your agents <span className="text-muted-foreground">reproducible?</span>
                        </h2>
                        <p className="text-xl text-muted-foreground/80 leading-relaxed max-w-2xl mx-auto mb-10 font-light">
                            Add determinism to your agent runtime in minutes.<br className="hidden md:block" />
                            No code rewrites. No risk to production.
                        </p>
                    </motion.div>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
                    >
                        <Button
                            size="lg"
                            className="h-12 px-8 text-base bg-foreground text-background hover:bg-foreground/90 transition-colors w-full sm:w-auto"
                        >
                            Start recording execution
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            className="h-12 px-8 text-base border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full sm:w-auto"
                        >
                            <BookOpen className="mr-2 w-4 h-4" />
                            Read the integration guide
                        </Button>
                    </motion.div>

                    {/* Trust Line */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <p className="text-sm font-mono text-muted-foreground/60">
                            Works with LangChain, custom agents, and in-house frameworks.
                        </p>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};
