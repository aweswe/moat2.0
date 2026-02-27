"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

/**
 * /auth/callback
 *
 * Client-side OAuth callback page.
 * When Supabase redirects back after Google/GitHub login, the URL contains
 * auth tokens in the hash fragment (#access_token=...) or a code parameter.
 *
 * The Supabase JS client automatically detects these and establishes the session.
 * We just wait for the session to be ready, then redirect to /dashboard.
 */
export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            // Check for code in URL (PKCE flow)
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");

            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error("[Auth Callback] Code exchange error:", error.message);
                    router.push("/login?error=auth_callback_failed");
                    return;
                }
            }

            // Wait briefly for session to be established (hash fragment flow)
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                router.push("/dashboard");
            } else {
                // Give it a moment — onAuthStateChange may still be processing
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession();
                    if (retrySession) {
                        router.push("/dashboard");
                    } else {
                        router.push("/login?error=auth_callback_failed");
                    }
                }, 1500);
            }
        };

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Signing you in...</p>
            </div>
        </div>
    );
}
