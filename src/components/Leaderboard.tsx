'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { LeaderboardUser, SeismicUser } from '@/types/database_manual';
import { getHighestRoleIcon } from '@/lib/roleUtils';
import { getAllUserBadges, Badge } from '@/lib/badgeUtils';
import UserDetailModal from './UserDetailModal';

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
            // 1. Get total user count for rank calculation
            const { count: totalUsers, error: countError } = await supabase
                .from('seismic_dc_user')
                .select('*', { count: 'exact', head: true })
                .eq('is_bot', false);

            if (countError) throw countError;

            // 2. Fetch top users sorted by TOTAL MESSAGES to establish contribution rank
            // We fetch a larger limit to ensure we capture badge holders (Top 1% badges depend on this order)
            const { data, error } = await supabase
                .from('seismic_dc_user')
                .select('id, user_id, username, x_username, display_name, avatar_url, roles, tweet, art, total_messages, general_chat, magnitude_chat, devnet_chat, report_chat, joined_at, first_message_date, last_message_date, region')
                .eq('is_bot', false)
                .order('total_messages', { ascending: false })
                .limit(1000);

            if (error) throw error;

            interface UserRow {
                id: number;
                user_id: string;
                username: string;
                x_username: string | null;
                display_name: string | null;
                avatar_url: string | null;
                roles: string[] | null;
                tweet: number;
                art: number;
                total_messages: number;
                general_chat: number;
                magnitude_chat: number;
                devnet_chat: number;
                report_chat: number;
                joined_at: string | null;
                first_message_date: string | null;
                last_message_date: string | null;
                region: string | null;
            }

            let rows = (data || []) as UserRow[];

            // 3. Calculate badges for each user
            // We pass the index+1 as their 'contribution rank' since we sorted by total_messages
            const rowsWithBadges = rows.map((row, index) => {
                const userForBadges = {
                    ...row,
                } as unknown as SeismicUser;

                // Calculate all badges including achievements
                const badges = getAllUserBadges(userForBadges, {
                    rank: index + 1,
                    totalUsers: totalUsers || 1
                });

                // Filter only achieved badges
                const achievedBadges = badges.filter(b => b.achieved);

                return {
                    ...row,
                    badgeCount: achievedBadges.length,
                    // Store the badges for potential tooltip usage if needed, but count is main thing
                };
            });

            // 4. Sort by Badge Count (Descending), then by Total Messages (Descending) as tie-breaker
            rowsWithBadges.sort((a, b) => {
                if (b.badgeCount !== a.badgeCount) {
                    return b.badgeCount - a.badgeCount;
                }
                return b.total_messages - a.total_messages;
            });

            // 5. Paginate
            const start = (currentPage - 1) * limit;
            const paginatedRows = rowsWithBadges.slice(start, start + limit);

            // Update hasMore based on slice
            setHasMore(start + limit < rowsWithBadges.length);

            // 6. Map to LeaderboardUser and assign Display Rank
            const rankedData: LeaderboardUser[] = paginatedRows.map((user, index) => {
                return {
                    id: user.id,
                    user_id: user.user_id,
                    username: user.username,
                    x_username: user.x_username || null,
                    display_name: user.display_name,
                    avatar_url: user.avatar_url,
                    roles: user.roles,
                    tweet: user.tweet,
                    art: user.art,
                    total_messages: user.total_messages,
                    account_created: null, // Not fetched
                    general_chat: user.general_chat || 0,
                    magnitude_chat: user.magnitude_chat || 0,
                    devnet_chat: user.devnet_chat || 0,
                    report_chat: user.report_chat || 0,
                    joined_at: user.joined_at,
                    first_message_date: user.first_message_date,
                    last_message_date: user.last_message_date,
                    region: user.region || null,
                    is_bot: false,
                    badgeCount: user.badgeCount,
                    rank: start + index + 1, // This is the rank in the BADGE leaderboard
                };
            });

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
                <div style={{ padding: 16, borderTop: '1px solid var(--seismic-gray-800)' }}>
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
