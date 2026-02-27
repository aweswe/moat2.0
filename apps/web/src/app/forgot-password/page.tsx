"use client";

import * as React from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AgentTraceLogo } from "@/components/ui/logo";

export default function ForgotPasswordPage() {
    const [email, setEmail] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [sent, setSent] = React.useState(false);
    const [error, setError] = React.useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);
        setError("");

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setError(error.message);
            setIsSubmitting(false);
        } else {
            setSent(true);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded bg-foreground/10 flex items-center justify-center">
                            <AgentTraceLogo size={18} className="text-foreground" />
                        </div>
                        <span className="font-semibold text-lg tracking-tight text-foreground">
                            AgentTrace
                        </span>
                    </Link>
                    <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {sent
                            ? "Check your email for a reset link"
                            : "Enter your email and we'll send you a reset link"}
                    </p>
                </div>

                {sent ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm text-center">
                            We sent a password reset link to <strong>{email}</strong>
                        </div>
                        <Link href="/login">
                            <Button variant="outline" className="w-full h-10 gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back to sign in
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-foreground">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full border border-border rounded-md pl-10 pr-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting || !email}
                            className="w-full h-10 font-medium"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                "Send reset link"
                            )}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            <Link href="/login" className="text-foreground font-medium hover:underline">
                                Back to sign in
                            </Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
