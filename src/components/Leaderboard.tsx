'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { LeaderboardUser } from '@/types/database';
import { getHighestRoleIcon } from '@/lib/roleUtils';
import UserDetailModal from './UserDetailModal';

type LeaderboardType = 'combined' | 'tweet' | 'art';

interface LeaderboardProps {
    initialType?: LeaderboardType;
}

export default function Leaderboard({ initialType = 'combined' }: LeaderboardProps) {
    const [type, setType] = useState<LeaderboardType>(initialType);
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
    const limit = 25;

    const fetchLeaderboard = useCallback(async (reset = false) => {
        setLoading(true);
        const currentPage = reset ? 1 : page;

        try {
            let query = supabase
                .from('seismic_dc_user')
                .select('id, username, display_name, avatar_url, roles, tweet, art, total_messages')
                .eq('is_bot', false);

            // Apply ordering based on type - these columns are indexed
            switch (type) {
                case 'tweet':
                    query = query.gt('tweet', 0).order('tweet', { ascending: false });
                    break;
                case 'art':
                    query = query.gt('art', 0).order('art', { ascending: false });
                    break;
                case 'combined':
                default:
                    query = query.gt('total_messages', 0).order('total_messages', { ascending: false });
                    break;
            }

            query = query.range((currentPage - 1) * limit, currentPage * limit - 1);

            const { data, error } = await query;

            if (error) throw error;

            interface UserRow {
                id: number;
                username: string;
                display_name: string | null;
                avatar_url: string | null;
                roles: string[] | null;
                tweet: number;
                art: number;
                total_messages: number;
            }

            const rankedData: LeaderboardUser[] = ((data || []) as UserRow[]).map((user, index) => ({
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                roles: user.roles,
                tweet: user.tweet,
                art: user.art,
                total_messages: user.total_messages,
                rank: (currentPage - 1) * limit + index + 1,
            }));

            if (reset) {
                setUsers(rankedData);
                setPage(1);
            } else {
                setUsers((prev) => [...prev, ...rankedData]);
            }

            setHasMore((data?.length || 0) === limit);
        } catch (error) {
            console.error('Leaderboard fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [type, page]);

    useEffect(() => {
        fetchLeaderboard(true);
    }, [type]);

    const handleLoadMore = () => {
        setPage((p) => p + 1);
        fetchLeaderboard(false);
    };

    const getStatValue = (user: LeaderboardUser) => {
        switch (type) {
            case 'tweet':
                return user.tweet;
            case 'art':
                return user.art;
            default:
                return user.total_messages;
        }
    };

    const getStatLabel = () => {
        switch (type) {
            case 'tweet':
                return 'Tweets';
            case 'art':
                return 'Art';
            default:
                return 'Total';
        }
    };

    const getRankClass = (rank: number) => {
        if (rank === 1) return 'rank-1';
        if (rank === 2) return 'rank-2';
        if (rank === 3) return 'rank-3';
        return 'rank-default';
    };

    return (
        <div>
            {/* Enhanced Tab Selector */}
            <div className="tabs" style={{
                marginBottom: 24,
                background: 'linear-gradient(135deg, rgba(212, 187, 110, 0.05) 0%, rgba(130, 90, 96, 0.05) 100%)',
                border: '2px solid var(--seismic-gray-800)',
                padding: 6,
            }}>
                <button
                    className={`tab ${type === 'combined' ? 'active' : ''}`}
                    onClick={() => setType('combined')}
                    style={{
                        transition: 'all var(--transition-normal)',
                    }}
                >
                    Tweet + Art
                </button>
                <button
                    className={`tab ${type === 'tweet' ? 'active' : ''}`}
                    onClick={() => setType('tweet')}
                    style={{
                        transition: 'all var(--transition-normal)',
                    }}
                >
                    Tweet Only
                </button>
                <button
                    className={`tab ${type === 'art' ? 'active' : ''}`}
                    onClick={() => setType('art')}
                    style={{
                        transition: 'all var(--transition-normal)',
                    }}
                >
                    Art Only
                </button>
            </div>

            {/* Leaderboard Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>Rank</th>
                                <th>User</th>
                                {type === 'combined' && (
                                    <>
                                        <th style={{ width: 100, textAlign: 'right' }}>Tweet</th>
                                        <th style={{ width: 100, textAlign: 'right' }}>Art</th>
                                    </>
                                )}
                                <th style={{ width: 100, textAlign: 'right' }}>{getStatLabel()}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, index) => {
                                const roleIcon = getHighestRoleIcon(user.roles);
                                return (
                                    <tr
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        style={{
                                            cursor: 'pointer',
                                            animation: `slideInUp 0.3s ease-out ${index * 0.03}s both`,
                                            transition: 'all var(--transition-normal)',
                                        }}
                                        className="hover-row"
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'rgba(212, 187, 110, 0.05)';
                                            (e.currentTarget as HTMLTableRowElement).style.transform = 'scale(1.01)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent';
                                            (e.currentTarget as HTMLTableRowElement).style.transform = 'scale(1)';
                                        }}
                                    >
                                        <td>
                                            <div className={`rank-badge ${getRankClass(user.rank!)}`} style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 700,
                                            }}>
                                                {user.rank! <= 3 ? (
                                                    <span style={{ fontSize: '1.2rem', marginRight: 2 }}>
                                                        {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                                                    </span>
                                                ) : null}
                                                #{user.rank}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div className="avatar avatar-sm" style={{
                                                    transition: 'all var(--transition-fast)',
                                                    border: '2px solid transparent',
                                                }}>
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.username} crossOrigin="anonymous" />
                                                    ) : (
                                                        user.username[0].toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium truncate" style={{
                                                        color: 'var(--seismic-white)',
                                                        maxWidth: 200,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6
                                                    }}>
                                                        {user.display_name || user.username}
                                                        {roleIcon && (
                                                            <img
                                                                src={roleIcon}
                                                                alt=""
                                                                title="Highest Role"
                                                                style={{ width: 16, height: 16, objectFit: 'contain' }}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                                        @{user.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {type === 'combined' && (
                                            <>
                                                <td style={{ textAlign: 'right' }}>
                                                    <span className="text-secondary font-medium" style={{ display: 'inline-block', transition: 'all var(--transition-fast)' }}>
                                                        {user.tweet.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <span className="text-accent font-medium" style={{ display: 'inline-block', transition: 'all var(--transition-fast)' }}>
                                                        {user.art.toLocaleString()}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        <td style={{ textAlign: 'right' }}>
                                            <span className="font-semibold text-primary" style={{ display: 'inline-block', fontSize: '1.0625rem', transition: 'all var(--transition-fast)' }}>
                                                {getStatValue(user).toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Loading / Load More */}
                <div style={{ padding: 16, borderTop: '1px solid var(--seismic-gray-800)' }}>
                    {loading && users.length === 0 ? (
                        <div className="flex justify-center">
                            <div className="spinner" />
                        </div>
                    ) : hasMore ? (
                        <button
                            className="btn btn-secondary w-full"
                            onClick={handleLoadMore}
                            disabled={loading}
                            style={{
                                transition: 'all var(--transition-normal)',
                            }}
                        >
                            {loading ? (
                                <>
                                    <span style={{
                                        display: 'inline-block',
                                        width: 16,
                                        height: 16,
                                        border: '2px solid currentColor',
                                        borderTopColor: 'transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                        marginRight: 8,
                                    }} />
                                    Loading...
                                </>
                            ) : 'Load More'}
                        </button>
                    ) : (
                        <p className="text-center text-muted" style={{ fontSize: '0.875rem' }}>
                            ✨ End of leaderboard
                        </p>
                    )}
                </div>
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}

            <style jsx>{`
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}
