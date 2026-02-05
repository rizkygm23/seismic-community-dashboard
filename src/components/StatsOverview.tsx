'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CommunityStats, RoleDistribution } from '@/types/database';
import { getHighestRoleIcon, getRoleIconPath } from '@/lib/roleUtils';
import EncryptedText from './EncryptedText';
import TerminalLoader from './TerminalLoader';
import UserDetailModal from './UserDetailModal';

// Defines extended user info for top contributors
interface TopContributor {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    roles: string[] | null;
    total: number;
}

export default function StatsOverview() {
    const [stats, setStats] = useState<CommunityStats | null>(null);
    const [roleStats, setRoleStats] = useState<RoleDistribution[]>([]);
    const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<TopContributor | null>(null);
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [timeAgo, setTimeAgo] = useState('just now');

    // Timer to update 'timeAgo' display every minute
    useEffect(() => {
        if (!lastUpdated) return;

        const updateTime = () => {
            const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
            if (seconds < 60) {
                setTimeAgo('just now');
            } else {
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) {
                    setTimeAgo(`${minutes}m ago`);
                } else {
                    const hours = Math.floor(minutes / 60);
                    setTimeAgo(`${hours}h ago`);
                }
            }
        };

        updateTime(); // Initial
        const interval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [lastUpdated]);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                // Fetch all stats in parallel for efficiency
                const [statsResult, topResult, active7dResult, active30dResult, verifiedCount, leaderCount, latestUpdateResult] = await Promise.all([
                    // Main stats using aggregate functions
                    supabase.rpc('get_community_stats'),

                    // Top 5 contributors
                    supabase.from('seismic_dc_user')
                        .select('id, username, display_name, avatar_url, roles, total_messages')
                        .eq('is_bot', false)
                        .order('total_messages', { ascending: false })
                        .limit(5),

                    // Active users in last 7 days
                    supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .gte('last_message_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

                    // Active users in last 30 days
                    supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .gte('last_message_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

                    // Direct count for Verified role
                    supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .contains('roles', ['Verified']),

                    supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .contains('roles', ['Leader']),

                    // Latest update timestamp
                    supabase.from('seismic_dc_user')
                        .select('updated_at')
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .single(),
                ]);

                // Fetch all user roles in batches for Magnitude processing
                // Supabase default limit is 1000, so we need to paginate
                const allRolesData: { roles: string[] | null }[] = [];
                const batchSize = 1000;
                let offset = 0;
                let hasMore = true;

                while (hasMore) {
                    const { data: batch } = await supabase
                        .from('seismic_dc_user')
                        .select('roles')
                        .eq('is_bot', false)
                        .not('roles', 'is', null)
                        .range(offset, offset + batchSize - 1);

                    if (batch && batch.length > 0) {
                        allRolesData.push(...batch);
                        offset += batchSize;
                        hasMore = batch.length === batchSize;
                    } else {
                        hasMore = false;
                    }
                }

                // Process role distribution - only count highest magnitude for each user
                const roleMap = new Map<string, number>();
                const magnitudePattern = /^Magnitude (\d+\.?\d*)$/;

                allRolesData.forEach((row) => {
                    const userRoles = row.roles || [];

                    // Find highest magnitude for this user
                    let highestMagnitude: number | null = null;
                    let highestMagnitudeRole: string | null = null;

                    userRoles.forEach((role) => {
                        const match = role.match(magnitudePattern);
                        if (match) {
                            const magValue = parseFloat(match[1]);
                            if (highestMagnitude === null || magValue > highestMagnitude) {
                                highestMagnitude = magValue;
                                highestMagnitudeRole = role;
                            }
                        }
                    });

                    // Only count highest magnitude role
                    if (highestMagnitudeRole) {
                        roleMap.set(highestMagnitudeRole, (roleMap.get(highestMagnitudeRole) || 0) + 1);
                    }
                });

                // Add Verified and Leader with accurate counts from database
                if (verifiedCount.count && verifiedCount.count > 0) {
                    roleMap.set('Verified', verifiedCount.count);
                }
                if (leaderCount.count && leaderCount.count > 0) {
                    roleMap.set('Leader', leaderCount.count);
                }

                const sortedRoles = Array.from(roleMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([role_name, user_count]) => ({ role_name, user_count }));

                setRoleStats(sortedRoles);

                // Get basic stats if RPC doesn't exist, use fallback
                if (statsResult.error) {
                    // Fallback: fetch counts manually
                    const [totalCount, humanCount, botCount] = await Promise.all([
                        supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }),
                        supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false),
                        supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', true),
                    ]);

                    // Fetch all users in batches to calculate sums correctly
                    // Supabase default limit is 1000, so we need to paginate
                    let totalMsg = 0, tweetMsg = 0, artMsg = 0;
                    let activeUsers = 0;
                    const batchSize = 1000;
                    let offset = 0;
                    let hasMore = true;

                    while (hasMore) {
                        const { data: batch } = await supabase
                            .from('seismic_dc_user')
                            .select('total_messages, tweet, art')
                            .eq('is_bot', false)
                            .range(offset, offset + batchSize - 1);

                        if (batch && batch.length > 0) {
                            batch.forEach((row: { total_messages: number; tweet: number; art: number }) => {
                                totalMsg += row.total_messages || 0;
                                tweetMsg += row.tweet || 0;
                                artMsg += row.art || 0;
                                if (row.total_messages > 0) activeUsers++;
                            });
                            offset += batchSize;
                            hasMore = batch.length === batchSize;
                        } else {
                            hasMore = false;
                        }
                    }

                    setStats({
                        total_users: totalCount.count || 0,
                        human_users: humanCount.count || 0,
                        bot_users: botCount.count || 0,
                        total_messages: totalMsg,
                        tweet_messages: tweetMsg,
                        art_messages: artMsg,
                        avg_messages_per_active_user: activeUsers > 0 ? totalMsg / activeUsers : 0,
                        active_users_7d: active7dResult.count || 0,
                        active_users_30d: active30dResult.count || 0,
                    });
                } else {
                    const rpcData = statsResult.data as CommunityStats | null;
                    if (rpcData) {
                        setStats({
                            total_users: rpcData.total_users,
                            human_users: rpcData.human_users,
                            bot_users: rpcData.bot_users,
                            total_messages: rpcData.total_messages,
                            tweet_messages: rpcData.tweet_messages,
                            art_messages: rpcData.art_messages,
                            avg_messages_per_active_user: rpcData.avg_messages_per_active_user,
                            active_users_7d: active7dResult.count || 0,
                            active_users_30d: active30dResult.count || 0,
                        });
                    }
                }

                if (topResult.data) {
                    setTopContributors(topResult.data.map((r: any) => ({
                        id: r.id,
                        username: r.username,
                        display_name: r.display_name,
                        avatar_url: r.avatar_url,
                        roles: r.roles,
                        total: r.total_messages,
                    })));
                }

                if ((latestUpdateResult as any).data?.updated_at) {
                    setLastUpdated(new Date((latestUpdateResult as any).data.updated_at));
                }
            } catch (error) {
                console.error('Stats fetch error:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    if (loading) {
        return <TerminalLoader />;
    }

    if (!stats) {
        return (
            <div className="empty-state">
                <h3>Unable to load statistics</h3>
                <p>Please try again later</p>
            </div>
        );
    }

    const maxRoleCount = roleStats[0]?.user_count || 1;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                {/* Last Updated Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-mono" style={{ color: 'var(--seismic-gray-400)' }}>
                        Updated {timeAgo}
                    </span>
                </div>

                <button
                    onClick={() => setIsEncrypted(!isEncrypted)}
                    className="btn btn-secondary"
                    style={{ gap: 8, fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}
                >
                    {isEncrypted ? (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                            DECRYPT DATA
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            ENCRYPT DATA
                        </>
                    )}
                </button>
            </div>

            {/* Main Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 32
            }}>
                <div className="card">
                    <div className="stat-label">Active Users (30d)</div>
                    <div className="stat-value"><EncryptedText text={stats.active_users_30d.toLocaleString()} enabled={isEncrypted} /></div>
                    <div className="text-muted mt-2" style={{ fontSize: '0.8125rem' }}>
                        <EncryptedText text={stats.active_users_7d.toLocaleString()} enabled={isEncrypted} /> active in 7d
                    </div>
                </div>

                <div className="card">
                    <div className="stat-label">Total Contributions</div>
                    <div className="stat-value text-primary"><EncryptedText text={stats.total_messages.toLocaleString()} enabled={isEncrypted} /></div>
                    <div className="text-muted mt-2" style={{ fontSize: '0.8125rem' }}>
                        Tweet + Art combined
                    </div>
                </div>

                <div className="card">
                    <div className="stat-label">Tweet Contributions</div>
                    <div className="stat-value text-secondary"><EncryptedText text={stats.tweet_messages.toLocaleString()} enabled={isEncrypted} /></div>
                    <div className="text-muted mt-2" style={{ fontSize: '0.8125rem' }}>
                        {stats.total_messages > 0
                            ? <><EncryptedText text={((stats.tweet_messages / stats.total_messages) * 100).toFixed(1)} enabled={isEncrypted} />% of total</>
                            : '0% of total'}
                    </div>
                </div>

                <div className="card">
                    <div className="stat-label">Art Contributions</div>
                    <div className="stat-value text-accent"><EncryptedText text={stats.art_messages.toLocaleString()} enabled={isEncrypted} /></div>
                    <div className="text-muted mt-2" style={{ fontSize: '0.8125rem' }}>
                        {stats.total_messages > 0
                            ? <><EncryptedText text={((stats.art_messages / stats.total_messages) * 100).toFixed(1)} enabled={isEncrypted} />% of total</>
                            : '0% of total'}
                    </div>
                </div>




            </div>

            {/* Two Column Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 24
            }}>
                {/* Top Contributors */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Top Contributors</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {topContributors.map((user, index) => {
                            const roleIcon = getHighestRoleIcon(user.roles);
                            return (
                                <div
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        cursor: 'pointer',
                                    }}
                                    className="hover-row" // Add global hover style if available or use inline
                                >
                                    <div className={`rank-badge ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-default'}`}>
                                        {index + 1}
                                    </div>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.username}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '100%',
                                                height: '100%',
                                                background: 'var(--seismic-gray-700)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: 'var(--seismic-white)'
                                            }}>
                                                {user.username[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="font-medium truncate" style={{ color: 'var(--seismic-white)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <EncryptedText text={user.display_name || user.username} enabled={isEncrypted} />
                                            {roleIcon && (
                                                <img
                                                    src={roleIcon}
                                                    alt=""
                                                    title="Highest Role"
                                                    style={{ width: 14, height: 14, objectFit: 'contain' }}
                                                />
                                            )}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>@<EncryptedText text={user.username} enabled={isEncrypted} /></div>
                                    </div>
                                    <div className="font-semibold text-primary">
                                        <EncryptedText text={user.total.toLocaleString()} enabled={isEncrypted} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Role Distribution */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Role Distribution</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(() => {
                            const maxRoleCount = Math.max(...roleStats.map(r => r.user_count), 1);
                            return roleStats.map((role) => {
                                const iconPath = getRoleIconPath(role.role_name);

                                return (
                                    <div key={role.role_name}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: 4,
                                            fontSize: '0.875rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '70%' }}>
                                                {iconPath && (
                                                    <img
                                                        src={iconPath}
                                                        alt=""
                                                        style={{ width: 16, height: 16, objectFit: 'contain' }}
                                                    />
                                                )}
                                                <span className="truncate">{role.role_name}</span>
                                            </div>
                                            <span className="text-muted"><EncryptedText text={role.user_count.toLocaleString()} enabled={isEncrypted} /></span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${(role.user_count / maxRoleCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            {/* Message Distribution */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3 className="card-title">Contribution Distribution</h3>
                </div>
                <div style={{ display: 'flex', gap: 8, height: 40, borderRadius: 8, overflow: 'hidden' }}>
                    <div
                        style={{
                            flex: stats.tweet_messages,
                            background: 'var(--seismic-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: stats.tweet_messages > 0 ? 60 : 0,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--seismic-black)',
                        }}
                    >
                        {stats.total_messages > 0 && ((stats.tweet_messages / stats.total_messages) * 100).toFixed(0)}%
                    </div>
                    <div
                        style={{
                            flex: stats.art_messages,
                            background: 'var(--seismic-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: stats.art_messages > 0 ? 60 : 0,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--seismic-black)',
                        }}
                    >
                        {stats.total_messages > 0 && ((stats.art_messages / stats.total_messages) * 100).toFixed(0)}%
                    </div>
                    <div
                        style={{
                            flex: stats.total_messages - stats.tweet_messages - stats.art_messages,
                            background: 'var(--seismic-gray-600)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 60,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                        }}
                    >
                        {stats.total_messages > 0 && (((stats.total_messages - stats.tweet_messages - stats.art_messages) / stats.total_messages) * 100).toFixed(0)}%
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 12, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--seismic-secondary)' }} />
                        <span className="text-muted">Tweet</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--seismic-accent)' }} />
                        <span className="text-muted">Art</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--seismic-gray-600)' }} />
                        <span className="text-muted">Other</span>
                    </div>
                </div>
            </div>
            {/* User Detail Modal */}
            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
}

