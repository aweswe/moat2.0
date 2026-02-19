"use client";

import * as React from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Terminal, Shield, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
    const { signIn, user } = useAuth();
    const router = useRouter();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState("");

    // Redirect if already logged in
    React.useEffect(() => {
        if (user) router.push('/dashboard');
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        setIsSubmitting(true);
        setError("");

        const result = await signIn(email, password);
        if (result.error) {
            setError(result.error);
            setIsSubmitting(false);
        }
        // On success, onAuthStateChange will handle redirect
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
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-muted-foreground">Sign in to your workspace.</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground ml-1">Email</label>
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

                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand/50 transition-all font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting || !email || !password}
                            className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold tracking-wide h-11"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </Button>

                        <div className="text-center pt-2">
                            <span className="text-muted-foreground text-xs">Don't have an account? </span>
                            <Link href="/signup" className="text-brand text-xs font-semibold hover:underline">
                                Create one
                            </Link>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-border opacity-40">
                            <Terminal className="w-3 h-3" />
                            <span className="text-[10px] font-mono uppercase tracking-widest">Auth_Protocol: CREDENTIALS_V1</span>
                        </div>
                    </form>
                </div>

                <div className="mt-8 flex justify-center gap-8 text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-brand" />
                        <span className="text-xs font-medium">Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-brand" />
                        <span className="text-xs font-medium">SOC2_Ready</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
