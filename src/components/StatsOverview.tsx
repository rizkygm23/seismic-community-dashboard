'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CommunityStats, RoleDistribution, RegionDistribution, SeismicStatsSnapshot } from '@/types/database_manual';
import { getHighestRoleIcon, getRoleIconPath } from '@/lib/roleUtils';
import EncryptedText from './EncryptedText';
import { LoaderFive } from "@/components/ui/loader";
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
    const [regionStats, setRegionStats] = useState<RegionDistribution[]>([]);
    const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<TopContributor | null>(null);
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [timeAgo, setTimeAgo] = useState('just now');
    const [activeTab, setActiveTab] = useState<'overview' | 'regions'>('overview');

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
                // Fetch latest snapshot and top contributors in parallel
                const [snapshotResult, topResult, verifiedCount, leaderCount] = await Promise.all([
                    supabase.from('seismic_stats_snapshot')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single(),

                    // Top 5 contributors (still live)
                    supabase.from('seismic_dc_user')
                        .select('id, username, display_name, avatar_url, roles, total_messages')
                        .eq('is_bot', false)
                        .order('total_messages', { ascending: false })
                        .limit(5),

                    // Direct count for Verified role (optional, could be moved to worker but quick enough)
                    supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .contains('roles', ['Verified']),

                    supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .contains('roles', ['Leader']),
                ]);

                // Supabase typings can be noisy here, so we cast to the known snapshot shape
                const snapshotData = (snapshotResult as any)?.data as SeismicStatsSnapshot | null;

                if (snapshotData) {
                    const snap = snapshotData;
                    setStats({
                        total_users: snap.total_users,
                        human_users: snap.human_users,
                        bot_users: snap.bot_users,
                        total_messages: snap.total_contributions, // Mapped from total_contributions
                        tweet_messages: snap.tweet_messages,
                        art_messages: snap.art_messages,
                        total_chat_messages: snap.total_chat_messages,
                        avg_messages_per_active_user: snap.avg_messages_per_active_user,
                        active_users_7d: snap.active_users_7d,
                        active_users_30d: snap.active_users_30d,
                    });

                    if (snap.region_stats) {
                        try {
                            // Parse JSONB if it comes as string, or use directly if object
                            const regions = typeof snap.region_stats === 'string'
                                ? JSON.parse(snap.region_stats)
                                : snap.region_stats;
                            setRegionStats(regions);
                        } catch (e) {
                            console.error("Error parsing region stats", e);
                        }
                    }

                    if (snap.role_stats) {
                        try {
                            const roles = typeof snap.role_stats === 'string'
                                ? JSON.parse(snap.role_stats)
                                : snap.role_stats;
                            setRoleStats(roles);
                        } catch (e) {
                            console.error("Error parsing role stats", e);
                        }
                    }

                    if (snap.created_at) {
                        setLastUpdated(new Date(snap.created_at));
                    }
                } else {
                    // Fallback or empty state if no snapshot yet
                    console.warn("No stats snapshot found.");
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



            } catch (error) {
                console.error('Stats fetch error:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <LoaderFive text="Loading Statistics..." />
            </div>
        );
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
            {/* Header Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
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

            {/* Section Tabs */}
            <div className="stats-tabs">
                <button
                    className={`stats-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
                    Overview
                </button>

                <button
                    className={`stats-tab ${activeTab === 'regions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('regions')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    Regions
                </button>
            </div>

            {/* === OVERVIEW TAB === */}
            {activeTab === 'overview' && (<>
                {/* Main Stats Grid */}
                <div className="grid-stats-cards" style={{ marginBottom: 32 }}>
                    <div className="card">
                        <div className="stat-label">Total Contributions</div>
                        <div className="stat-value text-primary"><EncryptedText text={stats.total_messages.toLocaleString()} enabled={isEncrypted} /></div>
                        <div className="text-muted mt-2" style={{ fontSize: '0.8125rem' }}>
                            Tweet + Art combined
                        </div>
                    </div>

                    <div className="card">
                        <div className="stat-label">Active Users (30d)</div>
                        <div className="stat-value"><EncryptedText text={stats.active_users_30d.toLocaleString()} enabled={isEncrypted} /></div>
                        <div className="text-muted mt-2" style={{ fontSize: '0.8125rem' }}>
                            <EncryptedText text={stats.active_users_7d.toLocaleString()} enabled={isEncrypted} /> active in 7d
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

                    <div className="card">
                        <div className="stat-label">Total Chat Messages</div>
                        <div className="stat-value" style={{ color: '#60d394' }}><EncryptedText text={stats.total_chat_messages.toLocaleString()} enabled={isEncrypted} /></div>
                        <div className="text-muted mt-2" style={{ fontSize: '0.8125rem' }}>
                            General + Devnet + Report only
                        </div>
                    </div>




                </div>

                {/* Two Column Layout */}
                <div className="grid-stats-overview">
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


                </div>
            </>)}



            {/* === REGIONS TAB === */}
            {activeTab === 'regions' && (<>
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

                {/* Region Distribution */}
                {regionStats.length > 0 && (
                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="card-header">
                            <h3 className="card-title">Region Distribution</h3>
                            <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                {regionStats.length} regions • {regionStats.reduce((sum, r) => sum + r.user_count, 0).toLocaleString()} users
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {(() => {
                                const maxRegionCount = Math.max(...regionStats.map(r => r.user_count), 1);
                                const totalRegionUsers = regionStats.reduce((sum, r) => sum + r.user_count, 0);

                                return regionStats.slice(0, 15).map((region, index) => {
                                    const percentage = ((region.user_count / totalRegionUsers) * 100).toFixed(1);
                                    const avgContrib = region.user_count > 0 ? Math.round(region.total_contributions / region.user_count) : 0;

                                    // Use consistent seismic primary color
                                    const barColor = 'var(--seismic-primary)';

                                    return (
                                        <div key={region.region}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: 4,
                                                fontSize: '0.875rem'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span className="rank-badge rank-default" style={{
                                                        minWidth: 24,
                                                        height: 24,
                                                        fontSize: '0.75rem',
                                                        background: index < 3 ? barColor : undefined,
                                                        color: index < 3 ? '#000' : undefined,
                                                    }}>
                                                        {index + 1}
                                                    </span>
                                                    <span style={{ fontWeight: 500 }}>
                                                        <EncryptedText text={region.region} enabled={isEncrypted} />
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.8125rem' }}>
                                                    <span className="text-muted">
                                                        <EncryptedText text={region.user_count.toLocaleString()} enabled={isEncrypted} /> users
                                                    </span>
                                                    <span style={{ color: 'var(--seismic-primary)', fontWeight: 500 }}>
                                                        {percentage}%
                                                    </span>
                                                    <span className="text-muted" title="Average contributions per user">
                                                        ~<EncryptedText text={avgContrib.toLocaleString()} enabled={isEncrypted} />/user
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${(region.user_count / maxRegionCount) * 100}%`,
                                                        background: barColor,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                            {regionStats.length > 15 && (
                                <div className="text-muted" style={{ textAlign: 'center', fontSize: '0.8125rem', paddingTop: 8 }}>
                                    + {regionStats.length - 15} more regions
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </>)}

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

