"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
    id: string;
    email: string;
    name: string;
    organizationId?: string | null;
    role: 'owner' | 'dev' | 'viewer';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    hasPermission: (action: 'view_traces' | 'create_branch' | 'invite_member' | 'delete_trace') => boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(null);
    const [loading, setLoading] = React.useState(true);
    const router = useRouter();

    React.useEffect(() => {
        let mounted = true;

        const handleAuthChange = async (session: any) => {
            if (!mounted) return;

            try {
                if (session?.user) {
                    // Only map if we don't already have this user
                    // This prevents loop if session updates with same user
                    // WE REMOVED THE CHECK to ensure profile updates are caught, 
                    // but we should probably check if ID changed to avoid "loop" of updates.
                    // For now, let's just do it but safeguard the loading state.
                    await mapSupabaseUser(session.user);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("[Auth] Error handling auth change:", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        // 1. Get initial session immediately to avoid flicker
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
            handleAuthChange(session);
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
            // Note: onAuthStateChange might fire INITIAL_SESSION immediately too, 
            // causing double-fire. But mapSupabaseUser should be idempotent enough 
            // or we can debounce.
            // For the "Loop" issue, we must ensure we don't trigger a state update that 
            // causes a re-render that causes a new subscription.
            console.log("[Auth] Event:", _event);
            handleAuthChange(session);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const processedUserIdRef = React.useRef<string | null>(null);

    const mapSupabaseUser = async (sbUser: SupabaseUser) => {
        // Prevent loops: If we just processed this user, skip.
        if (processedUserIdRef.current === sbUser.id) {
            console.log("[Auth] User already processed, skipping map:", sbUser.id);
            // Ensure loading is false even if we skip
            return;
        }

        try {
            const email = sbUser.email || '';
            const id = sbUser.id;
            console.log("[Auth] Mapping user:", email, "UID:", id);

            // Ensure Profile exists and is linked to Org
            // Using .limit(1) instead of .single() to avoid 406 noise if profile doesn't exist
            const { data: profiles, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', id)
                .limit(1);

            if (fetchError) {
                console.error("[Auth] Fetch error:", fetchError.message);
            }

            const profile = profiles?.[0];
            let orgId = profile?.organization_id;

            if (!profile) {
                console.log("[Auth] No profile found, creating for:", email);

                // Default Org ID from diag_db.py
                const defaultOrgId = "6cb9b31b-1678-4395-95b4-71caa628f94e";

                const isTestUser = email === "adityownseverything@gmail.com" || email === "adityaownseverything@gmail.com";

                if (isTestUser) {
                    orgId = defaultOrgId;
                }

                const payload = {
                    user_id: id,
                    organization_id: orgId || null,
                    role: isTestUser ? 'owner' : 'member',
                    display_name: sbUser.user_metadata?.full_name || email.split('@')[0],
                    onboarding_completed: true
                };

                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert(payload)
                    .select()
                    .single();

                if (insertError) {
                    console.error("[Auth] Profile creation failed:", insertError.message, insertError);
                } else {
                    console.log("[Auth] Profile created successfully:", newProfile);
                    orgId = newProfile.organization_id;
                }
            } else {
                console.log("[Auth] Found existing profile:", profile);
            }

            console.log("[Auth] Setting user state with OrgID:", orgId);
            processedUserIdRef.current = id;

            const isTestUser = email === "adityownseverything@gmail.com" || email === "adityaownseverything@gmail.com";

            setUser({
                id: id,
                email: email,
                name: sbUser.user_metadata?.full_name || email.split('@')[0] || 'User',
                organizationId: orgId,
                role: (profile?.role as any) || (isTestUser ? 'owner' : 'viewer')
            });
        } catch (err) {
            console.error("[Auth] Mapping crash:", err);
        }
    };

    const signIn = async (email: string) => {
        setLoading(true);
        // Using Magic Link for simple auth (AgentTrace 2.0 design)
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin + '/dashboard',
            },
        });

        if (error) {
            console.error("Auth error:", error.message);
            alert("Error: " + error.message);
            setLoading(false);
            return;
        }

        alert("Check your email for the magic link!");
        setLoading(false);
    };

    const signOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        router.push('/');
    };

    const hasPermission = (action: string): boolean => {
        if (!user) return false;
        if (user.role === 'owner') return true;

        switch (action) {
            case 'view_traces':
                return true; // All roles can view
            case 'create_branch':
                return user.role === 'dev'; // Owners (handled above) and devs
            case 'invite_member':
            case 'delete_trace':
                return false; // Only owners (handled above)
            default:
                return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, hasPermission }}>
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
