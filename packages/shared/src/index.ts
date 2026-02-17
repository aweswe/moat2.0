import { createClient } from '@supabase/supabase-js';

// Supabase client (lazy initialized to avoid SSR serialization issues during build)
export const getSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    return createClient(supabaseUrl, supabaseAnonKey);
};

// Shared types
export * from './types/database';
export * from './types/api';
export * from './mock-data';
