'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SeismicUser } from '@/types/database';
import { getHighestRoleIcon } from '@/lib/roleUtils';
import UserDetailModal from './UserDetailModal';
import html2canvas from 'html2canvas';

interface CompareResult {
    user1: SeismicUser;
    user2: SeismicUser;
    user1Rank: { total: number; tweet: number; art: number };
    user2Rank: { total: number; tweet: number; art: number };
}

const getMagnitude = (roles: string[] | null) => {
    if (!roles) return 0;
    let max = 0;
    const regex = /^Magnitude (\d+\.?\d*)$/;
    roles.forEach(r => {
        const m = r.match(regex);
        if (m) max = Math.max(max, parseFloat(m[1]));
    });
    return max;
};

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
    const [downloading, setDownloading] = useState(false);

    const comparisonRef = useRef<HTMLDivElement>(null);
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
            const [u1Total, u1Tweet, u1Art, u2Total, u2Tweet, u2Art] = await Promise.all([
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('total_messages', selectedUser1.total_messages),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('tweet', selectedUser1.tweet),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('art', selectedUser1.art),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('total_messages', selectedUser2.total_messages),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('tweet', selectedUser2.tweet),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('art', selectedUser2.art),
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

    const handleDownload = async () => {
        if (!comparisonRef.current) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(comparisonRef.current, {
                backgroundColor: '#0a0a0a',
                scale: 2,
                useCORS: true,
                logging: false,
            });
            const link = document.createElement('a');
            link.download = `comparison-${selectedUser1?.username}-vs-${selectedUser2?.username}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error(e);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div>
            {/* Search Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'start' }}>
                {/* User 1 */}
                <div>
                    <label className="text-muted" style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem' }}>User 1</label>
                    <div style={{ position: 'relative' }}>
                        <input type="text" className="input" placeholder="Search username..." value={user1Query} onChange={(e) => handleUser1Change(e.target.value)} />
                        {user1Results.length > 0 && (
                            <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, padding: 0, zIndex: 10, maxHeight: 250, overflow: 'auto' }}>
                                {user1Results.map((user) => (
                                    <button key={user.id} onClick={() => selectUser1(user)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--seismic-gray-800)', color: 'var(--seismic-white)', cursor: 'pointer', textAlign: 'left' }}>
                                        <div className="avatar avatar-sm">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.username[0].toUpperCase()}</div>
                                        <div>{user.username}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--seismic-gray-500)', paddingTop: 24 }}>VS</div>

                {/* User 2 */}
                <div>
                    <label className="text-muted" style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem' }}>User 2</label>
                    <div style={{ position: 'relative' }}>
                        <input type="text" className="input" placeholder="Search username..." value={user2Query} onChange={(e) => handleUser2Change(e.target.value)} />
                        {user2Results.length > 0 && (
                            <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, padding: 0, zIndex: 10, maxHeight: 250, overflow: 'auto' }}>
                                {user2Results.map((user) => (
                                    <button key={user.id} onClick={() => selectUser2(user)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--seismic-gray-800)', color: 'var(--seismic-white)', cursor: 'pointer', textAlign: 'left' }}>
                                        <div className="avatar avatar-sm">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.username[0].toUpperCase()}</div>
                                        <div>{user.username}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {loading && <div className="flex justify-center" style={{ padding: 40 }}><div className="spinner" /></div>}

            {compareResult && !loading && (
                <div style={{ marginTop: 32 }}>


                    <div ref={comparisonRef} className="card fade-in" style={{ padding: 24, backgroundColor: '#0a0a0a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>{compareResult.user1.avatar_url ? <img src={compareResult.user1.avatar_url} alt="" /> : compareResult.user1.username[0]}</div>
                                <h3>{compareResult.user1.display_name || compareResult.user1.username}</h3>
                                <div className="badge" style={{ marginTop: 8 }}>Magnitude {getMagnitude(compareResult.user1.roles)}.0</div>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--seismic-gray-600)', padding: '0 20px' }}>VS</div>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>{compareResult.user2.avatar_url ? <img src={compareResult.user2.avatar_url} alt="" /> : compareResult.user2.username[0]}</div>
                                <h3>{compareResult.user2.display_name || compareResult.user2.username}</h3>
                                <div className="badge" style={{ marginTop: 8 }}>Magnitude {getMagnitude(compareResult.user2.roles)}.0</div>
                            </div>
                        </div>

                        <ComparisonSummary r={compareResult} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
                            <CompareRow label="Total Contributions" val1={compareResult.user1.total_messages} val2={compareResult.user2.total_messages} rank1={compareResult.user1Rank.total} rank2={compareResult.user2Rank.total} />
                            <CompareRow label="Tweet Contributions" val1={compareResult.user1.tweet} val2={compareResult.user2.tweet} rank1={compareResult.user1Rank.tweet} rank2={compareResult.user2Rank.tweet} color="var(--seismic-secondary)" />
                            <CompareRow label="Art Contributions" val1={compareResult.user1.art} val2={compareResult.user2.art} rank1={compareResult.user1Rank.art} rank2={compareResult.user2Rank.art} color="var(--seismic-accent)" />
                        </div>

                        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--seismic-gray-800)', textAlign: 'center' }}>
                            <span className="text-muted" style={{ fontSize: '0.6875rem' }}>seismic.community contribution battle</span>
                        </div>
                    </div>
                </div>
            )}

            {modalUser && <UserDetailModal user={modalUser} onClose={() => setModalUser(null)} />}
        </div>
    );
}

function ComparisonSummary({ r }: { r: CompareResult }) {
    const wins1 = [
        r.user1.total_messages > r.user2.total_messages,
        r.user1.tweet > r.user2.tweet,
        r.user1.art > r.user2.art,
    ].filter(Boolean).length;

    const winner = wins1 >= 2 ? r.user1 : (wins1 === 0 ? r.user2 : (r.user1.total_messages > r.user2.total_messages ? r.user1 : r.user2));
    const isTie = wins1 === 1.5; // Impossible with 3 metrics but logical safety

    return (
        <div style={{
            background: 'var(--seismic-gray-900)',
            padding: 16,
            borderRadius: 'var(--border-radius-sm)',
            textAlign: 'center',
            marginBottom: 24,
            borderLeft: `4px solid ${winner === r.user1 ? 'var(--seismic-primary)' : 'var(--seismic-secondary)'}`
        }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--seismic-gray-300)' }}>ANALYSIS</div>
            <div style={{ fontWeight: 600, fontSize: '1.125rem', marginTop: 4 }}>
                <span style={{ color: 'var(--seismic-white)' }}>{winner.display_name || winner.username}</span> is leading broadly!
            </div>
        </div>
    );
}

function CompareRow({ label, val1, val2, rank1, rank2, color = 'var(--seismic-primary)' }: { label: string; val1: number; val2: number; rank1: number; rank2: number; color?: string }) {
    const total = val1 + val2;
    const pct1 = total > 0 ? (val1 / total) * 100 : 50;
    const winner = val1 > val2 ? 'user1' : val2 > val1 ? 'user2' : 'tie';

    return (
        <div>
            <div className="text-muted" style={{ fontSize: '0.8125rem', marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: winner === 'user1' ? color : 'var(--seismic-gray-400)' }}>{val1.toLocaleString()}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>#{rank1.toLocaleString()}</div>
                </div>
                <div style={{ width: 200, display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct1}%`, background: winner === 'user1' ? color : 'var(--seismic-gray-800)' }} />
                    <div style={{ width: `${100 - pct1}%`, background: winner === 'user2' ? color : 'var(--seismic-gray-800)' }} />
                </div>
                <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: winner === 'user2' ? color : 'var(--seismic-gray-400)' }}>{val2.toLocaleString()}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>#{rank2.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}
