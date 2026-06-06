import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database_manual';

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    if (!adminClient) {
        adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                detectSessionInUrl: false,
                persistSession: false,
            },
        });
    }

    return adminClient;
}
