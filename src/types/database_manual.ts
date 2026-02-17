export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            seismic_dc_user: {
                Row: SeismicUser
                Insert: Partial<SeismicUser>
                Update: Partial<SeismicUser>
            }
            seismic_stats_snapshot: {
                Row: SeismicStatsSnapshot
                Insert: Partial<SeismicStatsSnapshot>
                Update: Partial<SeismicStatsSnapshot>
            }
        }
        Views: {
            [_: string]: {
                Row: Record<string, Json>
            }
        }
        Functions: {
            [_: string]: {
                Args: Record<string, unknown>
                Returns: unknown
            }
        }
        Enums: {
            [_: string]: string
        }
    }
}

export interface SeismicUser {
    id: number
    user_id: string
    x_username: string | null
    username: string
    display_name: string | null
    avatar_url: string | null
    roles: string[] | null
    total_messages: number
    tweet: number
    art: number
    general_chat: number
    magnitude_chat: number
    devnet_chat: number
    report_chat: number
    joined_at: string | null
    account_created: string | null
    first_message_date: string | null
    last_message_date: string | null
    region: string | null
    is_bot: boolean
    created_at?: string
    updated_at?: string
}

export interface SeismicStatsSnapshot {
    id: number
    total_users: number
    human_users: number
    bot_users: number
    total_contributions: number
    tweet_messages: number
    art_messages: number
    total_chat_messages: number
    active_users_7d: number
    active_users_30d: number
    avg_messages_per_active_user: number
    region_stats: Json
    role_stats: Json
    created_at: string
}

export interface LeaderboardUser extends SeismicUser {
    rank?: number
    badgeCount?: number
}

// Aggregated role distribution used by RoleExplorer and related components
export interface RoleDistribution {
    role_name: string
    user_count: number
}

// High-level community statistics derived from seismic_stats_snapshot
export interface CommunityStats {
    total_users: number
    human_users: number
    bot_users: number
    total_messages: number
    tweet_messages: number
    art_messages: number
    total_chat_messages: number
    avg_messages_per_active_user: number
    active_users_7d: number
    active_users_30d: number
}

// Per-region distribution used in StatsOverview region tab
export interface RegionDistribution {
    region: string
    user_count: number
    total_contributions: number
}