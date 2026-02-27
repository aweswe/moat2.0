"use client";

import { motion } from "framer-motion";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
    {
        question: "How is AgentTrace different from normal logs?",
        answer: "Traditional logs only capture strings of text when you explicitly write a print statement. AgentTrace automatically intercepts all tool calls, LLM requests (with full prompt/response payloads), and system state changes, stitching them into a deterministic timeline you can actually replay.",
    },
    {
        question: "How does the Replay feature work?",
        answer: "Because we capture the exact inputs, outputs, and side-effects of every step, AgentTrace can run your agent locally from any point in its history, injecting the original state so it behaves exactly as it did in production—without actually hitting external APIs again.",
    },
    {
        question: "Can I edit the code during a replay?",
        answer: "Yes. This is called 'Branching'. You can pause a replay, tweak your agent's prompt or Python code, and resume the execution from that exact state to see if your fix resolves the issue.",
    },
    {
        question: "Is my trace data private and secure?",
        answer: "Absolutely. AgentTrace offers SOC2-compliant cloud hosting, as well as a self-hosted Enterprise option if your traces contain highly sensitive PII or proprietary models that cannot leave your VPC.",
    },
    {
        question: "What languages and frameworks are supported?",
        answer: "We currently provide robust SDKs for Python and TypeScript. You can drop AgentTrace into any custom agent workflow, though we have native integrations for LangChain, LlamaIndex, and standard OpenAI/Anthropic clients.",
    },
];

export const FAQSection = () => {
    return (
        <section className="relative py-24 sm:py-32 bg-[#0a0a0a] overflow-hidden">
            {/* Dark Grid Background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: `
               linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
                    backgroundSize: '32px 32px',
                    maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 20%, transparent 100%)',
                }}
            />

            <div className="container relative z-10 max-w-3xl px-4 mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center px-3 py-1 text-[11px] font-medium tracking-widest text-white/50 uppercase border border-white/10 rounded-full mb-6">
                        FAQs
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-white/60 text-lg">
                        Everything you need to know about setting up and using AgentTrace.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {faqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="border border-white/10 bg-white/5 data-[state=open]:bg-white/10 px-6 rounded-2xl transition-colors duration-200"
                            >
                                <AccordionTrigger className="text-white hover:no-underline py-5 text-left text-base font-medium">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-white/60 leading-relaxed pb-6 text-base">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </motion.div>
            </div>
        </section>
    );
};
