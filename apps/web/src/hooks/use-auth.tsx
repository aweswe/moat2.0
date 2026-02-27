"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    role: 'owner' | 'dev' | 'viewer';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signInWithGoogle: () => Promise<void>;
    signInWithGitHub: () => Promise<void>;
    signOut: () => Promise<void>;
    hasPermission: (action: 'view_traces' | 'create_branch' | 'invite_member' | 'delete_trace') => boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(null);
    const [loading, setLoading] = React.useState(true);
    const router = useRouter();

    const processedUserIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        let mounted = true;

        const handleAuthChange = async (session: any) => {
            if (!mounted) return;
            try {
                if (session?.user) {
                    await mapSupabaseUser(session.user, session.access_token);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("[Auth] Error handling auth change:", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
            handleAuthChange(session);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
            console.log("[Auth] Event:", _event);
            if (_event === 'SIGNED_OUT') {
                processedUserIdRef.current = null;
                setUser(null);
                return;
            }
            handleAuthChange(session);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const mapSupabaseUser = async (sbUser: SupabaseUser, accessToken: string) => {
        if (processedUserIdRef.current === sbUser.id) {
            return;
        }

        try {
            const email = sbUser.email || '';
            console.log("[Auth] Setting up user:", email);

            // Check if 2FA is enabled and not yet verified for this session
            const twoFactorEnabled = sbUser.user_metadata?.two_factor_enabled;
            const twoFactorVerifiedAt = sbUser.user_metadata?.two_factor_verified_at;

            if (twoFactorEnabled) {
                // Check if verified within the last 24 hours
                const isVerified = twoFactorVerifiedAt &&
                    (Date.now() - new Date(twoFactorVerifiedAt).getTime()) < 24 * 60 * 60 * 1000;

                if (!isVerified) {
                    console.log("[Auth] 2FA required, redirecting to /login/verify");
                    // Don't fully set up the user yet — redirect to 2FA
                    setLoading(false);
                    router.push("/login/verify");
                    return;
                }
            }

            // Call server-side API (uses service role key, bypasses RLS)
            const res = await fetch('/api/auth/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("[Auth] Setup API failed:", data.error);
                setUser(null);
                return;
            }

            console.log("[Auth] Setup result:", data.status, data.membership);

            processedUserIdRef.current = sbUser.id;
            setUser({
                id: sbUser.id,
                email,
                name: data.membership.display_name || email.split('@')[0],
                organizationId: data.membership.org_id,
                role: data.membership.role as 'owner' | 'dev' | 'viewer',
            });
        } catch (err) {
            console.error("[Auth] Setup crash:", err);
            setUser(null);
        }
    };

    const signUp = async (email: string, password: string, name: string): Promise<{ error?: string; needsConfirmation?: boolean }> => {
        setLoading(true);
        processedUserIdRef.current = null; // Reset so mapSupabaseUser runs

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            console.error("[Auth] Signup error:", error.message);
            setLoading(false);
            return { error: error.message };
        }

        // If email confirmation is required, user won't have a session yet
        if (data?.user && !data.session) {
            setLoading(false);
            return { needsConfirmation: true };
        }

        // onAuthStateChange will fire → mapSupabaseUser → /api/auth/setup creates org
        return {};
    };

    const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
        setLoading(true);
        processedUserIdRef.current = null; // Reset so mapSupabaseUser runs

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("[Auth] Login error:", error.message);
            setLoading(false);
            return { error: error.message };
        }

        // onAuthStateChange triggers → mapSupabaseUser
        return {};
    };

    const signOut = async () => {
        setLoading(true);
        processedUserIdRef.current = null;
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        router.push('/login');
    };

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    const signInWithGitHub = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    const hasPermission = (action: string): boolean => {
        if (!user) return false;
        if (user.role === 'owner') return true;

        switch (action) {
            case 'view_traces':
                return true;
            case 'create_branch':
                return user.role === 'dev';
            case 'invite_member':
            case 'delete_trace':
                return false;
            default:
                return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signInWithGitHub, signOut, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
