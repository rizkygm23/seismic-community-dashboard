'use client';

import { useState, useEffect, useCallback } from 'react';
import { LeaderboardUser } from '@/types/database_manual';
import { getHighestRoleIcon } from '@/lib/roleUtils';
import UserDetailModal from './UserDetailModal';
import { communityApi } from '@/lib/communityApi';

export default function Leaderboard() {
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
            const { users: rankedData, hasMore } = await communityApi.getLeaderboard(currentPage, limit);
            setHasMore(hasMore);

            if (reset) {
                setUsers(rankedData);
                setPage(1);
            } else {
                setUsers((prev) => [...prev, ...rankedData]);
            }
        } catch (error) {
            console.error('Leaderboard fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchLeaderboard(true);
    }, []);

    const handleLoadMore = () => {
        setPage((p) => p + 1);
        fetchLeaderboard(false);
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
                                <th style={{ width: 100, textAlign: 'right' }}>Badges</th>
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
                                                        color: 'var(--seismic-ink)',
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
                                        <td style={{ textAlign: 'right' }}>
                                            <span className="font-semibold text-primary">
                                                {user.badgeCount || 0}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Loading / Load More */}
                <div style={{ padding: 16, borderTop: '1px solid var(--seismic-hairline)' }}>
                    {loading && users.length === 0 ? (
                        <div className="flex justify-center">
                            <div className="spinner" />
                        </div>
                    ) : hasMore && !searchQuery ? (
                        <button
                            className="btn btn-secondary w-full"
                            onClick={handleLoadMore}
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Load More'}
                        </button>
                    ) : !hasMore || searchQuery ? (
                        <p className="text-center text-muted" style={{ fontSize: '0.875rem' }}>
                            {searchQuery ? 'End of search results' : 'End of leaderboard'}
                        </p>
                    ) : null}
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
