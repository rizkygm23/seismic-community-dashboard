'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SeismicUser } from '@/types/database';
import { getHighestRoleIcon } from '@/lib/roleUtils';
import UserDetailModal from './UserDetailModal';

interface CompareResult {
    user1: SeismicUser;
    user2: SeismicUser;
    user1Rank: { total: number; tweet: number; art: number };
    user2Rank: { total: number; tweet: number; art: number };
}

export default function CompareUsers() {
    const [user1Query, setUser1Query] = useState('');
    const [user2Query, setUser2Query] = useState('');
    const [user1Results, setUser1Results] = useState<SeismicUser[]>([]);
    const [user2Results, setUser2Results] = useState<SeismicUser[]>([]);
    const [selectedUser1, setSelectedUser1] = useState<SeismicUser | null>(null);
    const [selectedUser2, setSelectedUser2] = useState<SeismicUser | null>(null);
    const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [modalUser, setModalUser] = useState<SeismicUser | null>(null);

    const debounce1 = useRef<NodeJS.Timeout | null>(null);
    const debounce2 = useRef<NodeJS.Timeout | null>(null);

    const searchUser = async (query: string, setResults: (r: SeismicUser[]) => void) => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('seismic_dc_user')
                .select('*')
                .ilike('username', `%${query}%`)
                .eq('is_bot', false)
                .order('total_messages', { ascending: false })
                .limit(5);

            if (error) throw error;
            setResults((data as SeismicUser[]) || []);
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
        }
    };

    const handleUser1Change = (value: string) => {
        setUser1Query(value);
        setSelectedUser1(null);
        setCompareResult(null);
        if (debounce1.current) clearTimeout(debounce1.current);
        debounce1.current = setTimeout(() => searchUser(value, setUser1Results), 300);
    };

    const handleUser2Change = (value: string) => {
        setUser2Query(value);
        setSelectedUser2(null);
        setCompareResult(null);
        if (debounce2.current) clearTimeout(debounce2.current);
        debounce2.current = setTimeout(() => searchUser(value, setUser2Results), 300);
    };

    const selectUser1 = (user: SeismicUser) => {
        setSelectedUser1(user);
        setUser1Query(user.username);
        setUser1Results([]);
    };

    const selectUser2 = (user: SeismicUser) => {
        setSelectedUser2(user);
        setUser2Query(user.username);
        setUser2Results([]);
    };

    useEffect(() => {
        if (selectedUser1 && selectedUser2) {
            compareUsers();
        }
    }, [selectedUser1, selectedUser2]);

    const compareUsers = async () => {
        if (!selectedUser1 || !selectedUser2) return;

        setLoading(true);
        try {
            // Get ranks for both users
            const [u1Total, u1Tweet, u1Art, u2Total, u2Tweet, u2Art] = await Promise.all([
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true })
                    .eq('is_bot', false).gt('total_messages', selectedUser1.total_messages),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true })
                    .eq('is_bot', false).gt('tweet', selectedUser1.tweet),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true })
                    .eq('is_bot', false).gt('art', selectedUser1.art),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true })
                    .eq('is_bot', false).gt('total_messages', selectedUser2.total_messages),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true })
                    .eq('is_bot', false).gt('tweet', selectedUser2.tweet),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true })
                    .eq('is_bot', false).gt('art', selectedUser2.art),
            ]);

            setCompareResult({
                user1: selectedUser1,
                user2: selectedUser2,
                user1Rank: {
                    total: (u1Total.count || 0) + 1,
                    tweet: (u1Tweet.count || 0) + 1,
                    art: (u1Art.count || 0) + 1,
                },
                user2Rank: {
                    total: (u2Total.count || 0) + 1,
                    tweet: (u2Tweet.count || 0) + 1,
                    art: (u2Art.count || 0) + 1,
                },
            });
        } catch (error) {
            console.error('Compare error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getWinner = (val1: number, val2: number): 'user1' | 'user2' | 'tie' => {
        if (val1 > val2) return 'user1';
        if (val2 > val1) return 'user2';
        return 'tie';
    };

    return (
        <div>
            {/* Search Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'start' }}>
                {/* User 1 */}
                <div>
                    <label className="text-muted" style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem' }}>
                        User 1
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Search username..."
                            value={user1Query}
                            onChange={(e) => handleUser1Change(e.target.value)}
                        />
                        {user1Results.length > 0 && (
                            <div className="card" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: 4,
                                padding: 0,
                                zIndex: 10,
                                maxHeight: 250,
                                overflow: 'auto',
                            }}>
                                {user1Results.map((user) => {
                                    const roleIcon = getHighestRoleIcon(user.roles);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => selectUser1(user)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '10px 12px',
                                                background: 'transparent',
                                                border: 'none',
                                                borderBottom: '1px solid var(--seismic-gray-800)',
                                                color: 'var(--seismic-white)',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <div className="avatar avatar-sm">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.username} />
                                                ) : (
                                                    user.username[0].toUpperCase()
                                                )}
                                            </div>
                                            <div className="truncate" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {user.username}
                                                {roleIcon && (
                                                    <img
                                                        src={roleIcon}
                                                        alt=""
                                                        style={{ width: 14, height: 14, objectFit: 'contain' }}
                                                    />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {selectedUser1 && (
                        <div
                            style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                            onClick={() => setModalUser(selectedUser1)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="avatar">
                                {selectedUser1.avatar_url ? (
                                    <img src={selectedUser1.avatar_url} alt={selectedUser1.username} />
                                ) : (
                                    selectedUser1.username[0].toUpperCase()
                                )}
                            </div>
                            <div>
                                <div className="font-medium" style={{ color: 'var(--seismic-white)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {selectedUser1.display_name || selectedUser1.username}
                                    {getHighestRoleIcon(selectedUser1.roles) && (
                                        <img
                                            src={getHighestRoleIcon(selectedUser1.roles)!}
                                            alt=""
                                            style={{ width: 16, height: 16, objectFit: 'contain' }}
                                        />
                                    )}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                    @{selectedUser1.username}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* VS Divider */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--seismic-gray-500)',
                    paddingTop: 24,
                }}>
                    VS
                </div>

                {/* User 2 */}
                <div>
                    <label className="text-muted" style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem' }}>
                        User 2
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Search username..."
                            value={user2Query}
                            onChange={(e) => handleUser2Change(e.target.value)}
                        />
                        {user2Results.length > 0 && (
                            <div className="card" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: 4,
                                padding: 0,
                                zIndex: 10,
                                maxHeight: 250,
                                overflow: 'auto',
                            }}>
                                {user2Results.map((user) => {
                                    const roleIcon = getHighestRoleIcon(user.roles);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => selectUser2(user)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '10px 12px',
                                                background: 'transparent',
                                                border: 'none',
                                                borderBottom: '1px solid var(--seismic-gray-800)',
                                                color: 'var(--seismic-white)',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <div className="avatar avatar-sm">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.username} />
                                                ) : (
                                                    user.username[0].toUpperCase()
                                                )}
                                            </div>
                                            <div className="truncate" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {user.username}
                                                {roleIcon && (
                                                    <img
                                                        src={roleIcon}
                                                        alt=""
                                                        style={{ width: 14, height: 14, objectFit: 'contain' }}
                                                    />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {selectedUser2 && (
                        <div
                            style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                            onClick={() => setModalUser(selectedUser2)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="avatar">
                                {selectedUser2.avatar_url ? (
                                    <img src={selectedUser2.avatar_url} alt={selectedUser2.username} />
                                ) : (
                                    selectedUser2.username[0].toUpperCase()
                                )}
                            </div>
                            <div>
                                <div className="font-medium" style={{ color: 'var(--seismic-white)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {selectedUser2.display_name || selectedUser2.username}
                                    {getHighestRoleIcon(selectedUser2.roles) && (
                                        <img
                                            src={getHighestRoleIcon(selectedUser2.roles)!}
                                            alt=""
                                            style={{ width: 16, height: 16, objectFit: 'contain' }}
                                        />
                                    )}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                    @{selectedUser2.username}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center" style={{ padding: 40 }}>
                    <div className="spinner" />
                </div>
            )}

            {/* Comparison Results */}
            {compareResult && !loading && (
                <div className="card fade-in" style={{ marginTop: 32 }}>
                    <div className="card-header">
                        <h3 className="card-title">Comparison Results</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Total Messages */}
                        <CompareRow
                            label="Total Contributions"
                            val1={compareResult.user1.total_messages}
                            val2={compareResult.user2.total_messages}
                            rank1={compareResult.user1Rank.total}
                            rank2={compareResult.user2Rank.total}
                        />

                        {/* Tweets */}
                        <CompareRow
                            label="Tweet Contributions"
                            val1={compareResult.user1.tweet}
                            val2={compareResult.user2.tweet}
                            rank1={compareResult.user1Rank.tweet}
                            rank2={compareResult.user2Rank.tweet}
                            color="var(--seismic-secondary)"
                        />

                        {/* Art */}
                        <CompareRow
                            label="Art Contributions"
                            val1={compareResult.user1.art}
                            val2={compareResult.user2.art}
                            rank1={compareResult.user1Rank.art}
                            rank2={compareResult.user2Rank.art}
                            color="var(--seismic-accent)"
                        />
                    </div>
                </div>
            )}
            {/* User Detail Modal */}
            {modalUser && (
                <UserDetailModal
                    user={modalUser}
                    onClose={() => setModalUser(null)}
                />
            )}
        </div>
    );
}

function CompareRow({
    label,
    val1,
    val2,
    rank1,
    rank2,
    color = 'var(--seismic-primary)'
}: {
    label: string;
    val1: number;
    val2: number;
    rank1: number;
    rank2: number;
    color?: string;
}) {
    const total = val1 + val2;
    const pct1 = total > 0 ? (val1 / total) * 100 : 50;
    const winner = val1 > val2 ? 'user1' : val2 > val1 ? 'user2' : 'tie';

    return (
        <div>
            <div className="text-muted" style={{ fontSize: '0.8125rem', marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                {/* User 1 Value */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: winner === 'user1' ? color : 'var(--seismic-gray-400)'
                    }}>
                        {val1.toLocaleString()}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Rank #{rank1.toLocaleString()}</div>
                </div>

                {/* Bar */}
                <div style={{ width: 200, display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                        width: `${pct1}%`,
                        background: winner === 'user1' ? color : 'var(--seismic-gray-600)'
                    }} />
                    <div style={{
                        width: `${100 - pct1}%`,
                        background: winner === 'user2' ? color : 'var(--seismic-gray-600)'
                    }} />
                </div>

                {/* User 2 Value */}
                <div>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: winner === 'user2' ? color : 'var(--seismic-gray-400)'
                    }}>
                        {val2.toLocaleString()}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Rank #{rank2.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}
