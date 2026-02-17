-- Create new table for storing aggregated stats snapshots
CREATE TABLE seismic_stats_snapshot (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    total_users INTEGER DEFAULT 0,
    human_users INTEGER DEFAULT 0,
    bot_users INTEGER DEFAULT 0,
    total_contributions INTEGER DEFAULT 0,
    tweet_messages INTEGER DEFAULT 0,
    art_messages INTEGER DEFAULT 0,
    total_chat_messages INTEGER DEFAULT 0,
    active_users_7d INTEGER DEFAULT 0,
    active_users_30d INTEGER DEFAULT 0,
    avg_messages_per_active_user DECIMAL DEFAULT 0.0,
    region_stats JSONB DEFAULT '[]'::jsonb, -- Store region stats as JSON array
    role_stats JSONB DEFAULT '[]'::jsonb, -- Store role stats as JSON array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on created_at for fast retrieval of latest snapshot
CREATE INDEX idx_stats_snapshot_created_at ON seismic_stats_snapshot (created_at DESC);
