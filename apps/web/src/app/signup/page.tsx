"use client";

import * as React from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Terminal, Shield, Zap, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function SignupPage() {
    const { signIn } = useAuth();
    const [email, setEmail] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);
        try {
            await signIn(email);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
                        <div className="w-10 h-10 rounded-sm bg-blue-950/30 border border-brand/30 flex items-center justify-center group-hover:border-brand/50 transition-colors">
                            <div className="w-3 h-3 bg-brand rounded-sm shadow-[0_0_15px_rgba(70,130,180,0.5)]" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-foreground">
                            AgentTrace
                        </span>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Request Access</h1>
                    <p className="text-muted-foreground">Sign up for the private beta below.</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-start gap-4">
                            <Shield className="w-5 h-5 text-brand mt-1" />
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                We are currently in <span className="text-foreground font-semibold">private preview</span> for teams running infrastructure-critical agents.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground ml-1">Email_Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50 transition-all font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Button
                                type="submit"
                                size="xl"
                                disabled={isSubmitting || !email}
                                className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold tracking-wide"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    "Join Beta Waitlist"
                                )}
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-border opacity-40">
                            <Terminal className="w-3 h-3" />
                            <span className="text-[10px] font-mono uppercase tracking-widest">Auth_Protocol: MAGIC_LINK_V2</span>
                        </div>
                    </form>
                </div>

                <div className="mt-8 flex justify-center gap-8 text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-brand" />
                        <span className="text-xs font-medium">Deterministic</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-brand" />
                        <span className="text-xs font-medium">Full_Control</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
