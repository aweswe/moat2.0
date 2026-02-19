import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase URL or Anon Key is missing. Check your .env file.");
}

// Ensure singleton client on the frontend
export const supabase = (typeof window !== "undefined")
    ? (window as any)._supabaseInstance || ((window as any)._supabaseInstance = createClient(supabaseUrl, supabaseAnonKey))
    : createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend tasks
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (typeof window === "undefined") {
    if (!supabaseServiceRoleKey) {
        console.warn("[supabase] SUPABASE_SERVICE_ROLE_KEY is missing! Admin tasks will fail RLS.");
    }
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

