export interface SeismicUser {
    id: number;
    user_id: string;
    username: string;
    display_name: string | null;
    discriminator: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    accent_color: number | null;
    roles: string[] | null;
    is_bot: boolean;
    joined_at: string | null;
    account_created: string | null;
    custom_status: string | null;
    connected_accounts: string[] | null;
    tweet: number;
    art: number;
    total_messages: number;
    first_message_date: string | null;
    last_message_date: string | null;
    role_kamis: number | null;
    role_jumat: number | null;
    is_promoted: boolean | null;
    x_username: string | null;
    region: string | null;
    created_at: string;
    updated_at: string;
}

export interface Database {
    public: {
        Tables: {
            seismic_dc_user: {
                Row: SeismicUser;
                Insert: Omit<SeismicUser, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<SeismicUser, 'id'>>;
            };
        };
    };
}

export interface LeaderboardUser {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    roles: string[] | null;
    tweet: number;
    art: number;
    total_messages: number;
    rank?: number;
}

export interface CommunityStats {
    total_users: number;
    human_users: number;
    bot_users: number;
    total_messages: number;
    tweet_messages: number;
    art_messages: number;
    avg_messages_per_active_user: number;
    active_users_7d: number;
    active_users_30d: number;
}

export interface RoleDistribution {
    role_name: string;
    user_count: number;
}

export interface RegionDistribution {
    region: string;
    user_count: number;
    total_contributions: number;
}
