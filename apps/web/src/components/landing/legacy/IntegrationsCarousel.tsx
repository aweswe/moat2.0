"use client";

import { motion } from "framer-motion";
import { Server, Code2, Database, Github, Workflow, Box } from "lucide-react";

export const IntegrationsCarousel = () => {
    // We use a duplicated list to create a seamless infinite scroll effect
    const integrations = [
        { name: "Python", icon: Code2, color: "text-blue-500" },
        { name: "TypeScript", icon: Code2, color: "text-blue-600" },
        { name: "LangChain", icon: Workflow, color: "text-green-500" },
        { name: "LlamaIndex", icon: Box, color: "text-purple-500" },
        { name: "OpenAI", icon: Server, color: "text-foreground" },
        { name: "Gemini", icon: Database, color: "text-blue-400" },
        { name: "Anthropic", icon: Server, color: "text-orange-400" },
        { name: "GitHub Actions", icon: Github, color: "text-foreground" },
    ];

    const duplicatedIntegrations = [...integrations, ...integrations, ...integrations];

    return (
        <section className="py-24 bg-background overflow-hidden border-t border-border/50">
            <div className="container px-4">
                <div className="flex justify-center mb-12">
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-border/60 bg-muted/20 text-xs font-semibold tracking-widest uppercase text-muted-foreground shadow-sm">
                        Integrations
                    </div>
                </div>
            </div>

            {/* Seamless Scrolling Marquee */}
            <div className="relative flex overflow-x-hidden group">
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                <motion.div
                    className="flex shrink-0 items-center justify-start gap-12 sm:gap-24"
                    animate={{ x: ["0%", "-33.333333%"] }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem" }}
                >
                    {duplicatedIntegrations.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <div key={i} className="flex items-center gap-3 shrink-0 py-2 group/icon hover:scale-105 transition-transform cursor-default">
                                <Icon className={`w-8 h-8 ${item.color} drop-shadow-sm opacity-80 group-hover/icon:opacity-100 transition-opacity`} />
                                <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground/80 group-hover/icon:text-foreground transition-colors">
                                    {item.name}
                                </span>
                            </div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
};
