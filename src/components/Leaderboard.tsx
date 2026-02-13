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
    const [searchQuery, setSearchQuery] = useState('');
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

    // Filter users based on search
    const filteredUsers = searchQuery.trim()
        ? users.filter(u =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.display_name && u.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : users;

    return (
        <div>
            {/* Tab Selector */}
            <div className="tabs" style={{ marginBottom: 16 }}>
                <button
                    className={`tab ${type === 'combined' ? 'active' : ''}`}
                    onClick={() => setType('combined')}
                >
                    Tweet + Art
                </button>
                <button
                    className={`tab ${type === 'tweet' ? 'active' : ''}`}
                    onClick={() => setType('tweet')}
                >
                    Tweet Only
                </button>
                <button
                    className={`tab ${type === 'art' ? 'active' : ''}`}
                    onClick={() => setType('art')}
                >
                    Art Only
                </button>
            </div>

            {/* Search Filter */}
            <div className="leaderboard-search">
                <div style={{ position: 'relative', flex: 1 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--seismic-gray-500)' }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className="input"
                        placeholder="Find your rank..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: 36, fontSize: '0.875rem' }}
                    />
                </div>
                <span className="text-muted" style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                    {searchQuery ? `${filteredUsers.length} found` : `${users.length} loaded`}
                </span>
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
                            {filteredUsers.map((user) => {
                                const roleIcon = getHighestRoleIcon(user.roles);
                                return (
                                    <tr
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className="row-clickable"
                                    >
                                        <td>
                                            <div className={`rank-badge ${getRankClass(user.rank!)}`}>
                                                {user.rank}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div className="avatar avatar-sm">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.username} />
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
                                                    <span className="text-secondary font-medium">
                                                        {user.tweet.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <span className="text-accent font-medium">
                                                        {user.art.toLocaleString()}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        <td style={{ textAlign: 'right' }}>
                                            <span className="font-semibold text-primary">
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
                        >
                            {loading ? 'Loading...' : 'Load More'}
                        </button>
                    ) : (
                        <p className="text-center text-muted" style={{ fontSize: '0.875rem' }}>
                            End of leaderboard
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
        </div>
    );
}
