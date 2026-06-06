import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database_manual';
import {
    getSupabaseAuthRedirectCleanUrl,
    normalizeSupabaseAuthRedirectUrl,
    rememberAuthRedirectCleanUrl,
} from './authRedirect';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (typeof window !== 'undefined') {
    const normalizedAuthRedirect = normalizeSupabaseAuthRedirectUrl(window.location.href);

    if (normalizedAuthRedirect) {
        rememberAuthRedirectCleanUrl(normalizedAuthRedirect.cleanUrl);
        window.history.replaceState(window.history.state, '', normalizedAuthRedirect.authUrl);
    } else {
        const cleanUrl = getSupabaseAuthRedirectCleanUrl(window.location.href);
        if (cleanUrl) {
            rememberAuthRedirectCleanUrl(cleanUrl);
        }
    }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
