"use client";

import * as React from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Users, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export default function JoinPage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = React.useState<'loading' | 'ready' | 'accepting' | 'success' | 'error'>('loading');
    const [invite, setInvite] = React.useState<any>(null);
    const [errorMsg, setErrorMsg] = React.useState("");

    // Validate token on load
    React.useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMsg("No invite token provided.");
            return;
        }

        const validateToken = async () => {
            try {
                const res = await fetch(`/api/team/accept?token=${token}`);
                const data = await res.json();

                if (!res.ok) {
                    setStatus('error');
                    setErrorMsg(data.error || "Invalid invite link.");
                    return;
                }

                setInvite(data.invite);
                setStatus('ready');
            } catch (e: any) {
                setStatus('error');
                setErrorMsg(e.message || "Failed to validate invite.");
            }
        };

        validateToken();
    }, [token]);

    const handleAccept = async () => {
        if (!user) {
            // Store token in sessionStorage and redirect to signup/login
            sessionStorage.setItem('pendingInviteToken', token || '');
            router.push('/signup');
            return;
        }

        setStatus('accepting');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/team/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || ''}`
                },
                body: JSON.stringify({ token })
            });

            const data = await res.json();
            if (!res.ok) {
                setStatus('error');
                setErrorMsg(data.error || "Failed to accept invite.");
                return;
            }

            setStatus('success');
            // Force auth refresh by redirecting
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } catch (e: any) {
            setStatus('error');
            setErrorMsg(e.message);
        }
    };

    // Not logged in
    if (status === 'ready' && !user) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                    <div className="bg-card border border-border rounded-2xl p-10 shadow-xl text-center">
                        <div className="w-16 h-16 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center mx-auto mb-6">
                            <Users className="w-8 h-8 text-brand" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight mb-2">You're Invited</h2>
                        <p className="text-muted-foreground text-sm mb-2">
                            You've been invited to join <span className="text-foreground font-semibold">{invite?.org_name || 'a workspace'}</span> as <span className="text-brand font-semibold uppercase">{invite?.role}</span>.
                        </p>
                        <p className="text-muted-foreground text-xs mb-6">
                            Sign in or create an account to accept.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link href={`/login?redirect=/join?token=${token}`}>
                                <Button variant="outline" className="font-mono text-xs uppercase">Sign In</Button>
                            </Link>
                            <Link href={`/signup?redirect=/join?token=${token}`}>
                                <Button className="font-mono text-xs uppercase bg-foreground text-background hover:bg-foreground/90">Create Account</Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Loading / Accepting
    if (status === 'loading' || status === 'accepting') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <Loader2 className="w-8 h-8 animate-spin text-brand mb-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {status === 'loading' ? 'Validating invite...' : 'Joining workspace...'}
                </span>
            </div>
        );
    }

    // Success
    if (status === 'success') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
                    <div className="bg-card border border-border rounded-2xl p-10 shadow-xl">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome aboard!</h2>
                        <p className="text-muted-foreground text-sm">
                            You've joined <span className="text-foreground font-semibold">{invite?.org_name}</span>. Redirecting to dashboard...
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Error
    if (status === 'error') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
                    <div className="bg-card border border-border rounded-2xl p-10 shadow-xl">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold tracking-tight mb-2">Invalid Invite</h2>
                        <p className="text-muted-foreground text-sm mb-6">{errorMsg}</p>
                        <Link href="/login">
                            <Button variant="outline" className="font-mono text-xs uppercase">Go to Login</Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Ready + logged in → show accept button
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <div className="bg-card border border-border rounded-2xl p-10 shadow-xl text-center">
                    <div className="w-16 h-16 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center mx-auto mb-6">
                        <Users className="w-8 h-8 text-brand" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Join Workspace</h2>
                    <p className="text-muted-foreground text-sm mb-6">
                        You've been invited to join <span className="text-foreground font-semibold">{invite?.org_name || 'a workspace'}</span> as <span className="text-brand font-semibold uppercase">{invite?.role}</span>.
                    </p>
                    <Button
                        onClick={handleAccept}
                        className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold tracking-wide h-11"
                    >
                        <Shield className="w-4 h-4 mr-2" />
                        Accept & Join
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
