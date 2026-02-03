'use client';

import { SeismicUser } from '@/types/database';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getRoleIconPath, getHighestRoleIcon } from '@/lib/roleUtils';

interface UserCardProps {
    user: SeismicUser;
}

interface RankInfo {
    totalRank: number;
    tweetRank: number;
    artRank: number;
}

export default function UserCard({ user }: UserCardProps) {
    const [rankInfo, setRankInfo] = useState<RankInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRanks() {
            setLoading(true);
            try {
                // Get user's ranks efficiently using count queries
                const [totalRankResult, tweetRankResult, artRankResult] = await Promise.all([
                    supabase
                        .from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .gt('total_messages', user.total_messages),
                    supabase
                        .from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .gt('tweet', user.tweet),
                    supabase
                        .from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .gt('art', user.art),
                ]);

                setRankInfo({
                    totalRank: (totalRankResult.count || 0) + 1,
                    tweetRank: (tweetRankResult.count || 0) + 1,
                    artRank: (artRankResult.count || 0) + 1,
                });
            } catch (error) {
                console.error('Error fetching ranks:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRanks();
    }, [user]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getActivityDays = () => {
        if (!user.first_message_date || !user.last_message_date) return null;
        const first = new Date(user.first_message_date);
        const last = new Date(user.last_message_date);
        const days = Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 1;
    };

    const activityDays = getActivityDays();
    const messagesPerDay = activityDays ? (user.total_messages / activityDays).toFixed(1) : 'N/A';

    // Filter out special role values
    const displayRoles = (user.roles || []).filter(
        role => !['[Left Server]', '[Not Fetched]', '[Bot]', 'No Roles'].includes(role)
    );

    return (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* User Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                <div className="avatar avatar-xl">
                    {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} />
                    ) : (
                        user.username[0].toUpperCase()
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                        {user.display_name || user.username}
                        {getHighestRoleIcon(user.roles) && (
                            <img
                                src={getHighestRoleIcon(user.roles)!}
                                alt=""
                                title="Highest Role"
                                style={{ width: 24, height: 24, objectFit: 'contain' }}
                            />
                        )}
                    </h2>
                    <div className="text-muted" style={{ fontSize: '1rem' }}>@{user.username}</div>
                    {user.joined_at && (
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>
                            Joined {formatDate(user.joined_at)}
                        </div>
                    )}
                </div>
            </div>

            {/* Contribution Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginBottom: 24,
                padding: 20,
                background: 'var(--seismic-gray-800)',
                borderRadius: 'var(--border-radius)',
            }}>
                <div className="text-center">
                    <div className="stat-value text-primary">{user.total_messages.toLocaleString()}</div>
                    <div className="stat-label">Total Contributions</div>
                    {!loading && rankInfo && (
                        <div className="badge badge-primary" style={{ marginTop: 8 }}>
                            #{rankInfo.totalRank.toLocaleString()}
                        </div>
                    )}
                </div>
                <div className="text-center">
                    <div className="stat-value text-secondary">{user.tweet.toLocaleString()}</div>
                    <div className="stat-label">Tweets</div>
                    {!loading && rankInfo && (
                        <div className="badge badge-secondary" style={{ marginTop: 8 }}>
                            #{rankInfo.tweetRank.toLocaleString()}
                        </div>
                    )}
                </div>
                <div className="text-center">
                    <div className="stat-value text-accent">{user.art.toLocaleString()}</div>
                    <div className="stat-label">Art</div>
                    {!loading && rankInfo && (
                        <div className="badge badge-accent" style={{ marginTop: 8 }}>
                            #{rankInfo.artRank.toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Activity Breakdown */}
            <div style={{ marginBottom: 24 }}>
                <h4 style={{ marginBottom: 16 }}>Activity Breakdown</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div style={{
                        padding: 16,
                        background: 'var(--seismic-gray-800)',
                        borderRadius: 'var(--border-radius-sm)'
                    }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>First Activity</div>
                        <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                            {formatDate(user.first_message_date)}
                        </div>
                    </div>
                    <div style={{
                        padding: 16,
                        background: 'var(--seismic-gray-800)',
                        borderRadius: 'var(--border-radius-sm)'
                    }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Last Activity</div>
                        <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                            {formatDate(user.last_message_date)}
                        </div>
                    </div>
                    <div style={{
                        padding: 16,
                        background: 'var(--seismic-gray-800)',
                        borderRadius: 'var(--border-radius-sm)'
                    }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Active Days</div>
                        <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                            {activityDays ? `${activityDays} days` : 'N/A'}
                        </div>
                    </div>
                    <div style={{
                        padding: 16,
                        background: 'var(--seismic-gray-800)',
                        borderRadius: 'var(--border-radius-sm)'
                    }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Avg. per Day</div>
                        <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                            {messagesPerDay} per day
                        </div>
                    </div>
                </div>
            </div>

            {/* Message Distribution Bar */}
            <div style={{ marginBottom: 24 }}>
                <h4 style={{ marginBottom: 12 }}>Contribution Breakdown</h4>
                <div style={{
                    display: 'flex',
                    height: 12,
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'var(--seismic-gray-800)'
                }}>
                    {user.total_messages > 0 && (
                        <>
                            <div
                                style={{
                                    width: `${(user.tweet / user.total_messages) * 100}%`,
                                    background: 'var(--seismic-secondary)',
                                }}
                                title={`Tweets: ${((user.tweet / user.total_messages) * 100).toFixed(1)}%`}
                            />
                            <div
                                style={{
                                    width: `${(user.art / user.total_messages) * 100}%`,
                                    background: 'var(--seismic-accent)',
                                }}
                                title={`Art: ${((user.art / user.total_messages) * 100).toFixed(1)}%`}
                            />
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--seismic-secondary)' }} />
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Tweet</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--seismic-accent)' }} />
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Art</span>
                    </div>
                </div>
            </div>

            {/* Roles */}
            {displayRoles.length > 0 && (
                <div>
                    <h4 style={{ marginBottom: 12 }}>Roles</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {displayRoles.slice(0, 10).map((role, i) => {
                            const iconPath = getRoleIconPath(role);

                            return (
                                <span key={i} className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {iconPath && (
                                        <img
                                            src={iconPath}
                                            alt=""
                                            style={{ width: 14, height: 14, objectFit: 'contain' }}
                                        />
                                    )}
                                    {role}
                                </span>
                            );
                        })}
                        {displayRoles.length > 10 && (
                            <span className="badge">+{displayRoles.length - 10} more</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
