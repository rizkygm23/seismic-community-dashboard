'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { SeismicUser } from '@/types/database_manual';
import { getHighestMagnitudeRole, getRoleIconPath } from '@/lib/roleUtils';
import BattleCardImage from './BattleCardImage';

interface CompareResult {
    user1: SeismicUser;
    user2: SeismicUser;
    user1Rank: { total: number; tweet: number; art: number };
    user2Rank: { total: number; tweet: number; art: number };
    totalUsers: number;
}

type Phase = 'search' | 'finding-opponent' | 'reveal' | 'steps' | 'summary';

const STEP_TITLES = [
    'The Matchup',
    'Power Radar',
    'Head-to-Head Stats',
    'Activity Timeline',
    'Roles & Strengths',
];
const TOTAL_STEPS = STEP_TITLES.length;

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

// ═══════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

// ── Radar Chart ───────────────────────────────────────────────────
function RadarChart({ user1, user2, totalUsers, u1Rank, u2Rank }: {
    user1: SeismicUser; user2: SeismicUser; totalUsers: number;
    u1Rank: { total: number; tweet: number; art: number };
    u2Rank: { total: number; tweet: number; art: number };
}) {
    const cx = 150, cy = 150, r = 110;
    const numAxes = 6;
    const labels = ['Total Contributions', 'Tweets', 'Arts', 'Chat', 'Magnitude', 'Rank Score'];
    const normalize = (val: number, max: number) => max > 0 ? Math.min(val / max, 1) : 0;
    const maxTotal = Math.max(user1.total_messages, user2.total_messages, 1);
    const maxTweet = Math.max(user1.tweet, user2.tweet, 1);
    const maxArt = Math.max(user1.art, user2.art, 1);
    const u1Chat = user1.general_chat + user1.devnet_chat + user1.report_chat;
    const u2Chat = user2.general_chat + user2.devnet_chat + user2.report_chat;
    const maxChat = Math.max(u1Chat, u2Chat, 1);
    const u1Values = [
        normalize(user1.total_messages, maxTotal), normalize(user1.tweet, maxTweet),
        normalize(user1.art, maxArt), normalize(u1Chat, maxChat),
        normalize(getMagnitude(user1.roles), 9),
        normalize(totalUsers - u1Rank.total + 1, totalUsers),
    ];
    const u2Values = [
        normalize(user2.total_messages, maxTotal), normalize(user2.tweet, maxTweet),
        normalize(user2.art, maxArt), normalize(u2Chat, maxChat),
        normalize(getMagnitude(user2.roles), 9),
        normalize(totalUsers - u2Rank.total + 1, totalUsers),
    ];
    const getPoint = (index: number, value: number) => {
        const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
        return { x: cx + r * value * Math.cos(angle), y: cy + r * value * Math.sin(angle) };
    };
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

    return (
        <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 340, margin: '0 auto', display: 'block' }}>
            {gridLevels.map(level => (
                <polygon key={level}
                    points={Array.from({ length: numAxes }, (_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}`; }).join(' ')}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            ))}
            {Array.from({ length: numAxes }, (_, i) => {
                const p = getPoint(i, 1);
                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
            })}
            <polygon points={u1Values.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(' ')}
                fill="rgba(212,187,110,0.15)" stroke="#D4BB6E" strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 6px rgba(212,187,110,0.3))' }} />
            <polygon points={u2Values.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(' ')}
                fill="rgba(201,138,148,0.15)" stroke="#C98A94" strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 6px rgba(201,138,148,0.3))' }} />
            {u1Values.map((v, i) => { const p = getPoint(i, v); return <circle key={'u1-' + i} cx={p.x} cy={p.y} r="3.5" fill="#D4BB6E" />; })}
            {u2Values.map((v, i) => { const p = getPoint(i, v); return <circle key={'u2-' + i} cx={p.x} cy={p.y} r="3.5" fill="#C98A94" />; })}
            {labels.map((label, i) => {
                const p = getPoint(i, 1.22);
                return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.55)" fontSize="9" fontFamily="Inter, sans-serif">{label}</text>;
            })}
        </svg>
    );
}

// ── Animated Number ───────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const startTime = performance.now();
        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value, duration]);
    return <span>{display.toLocaleString()}</span>;
}

// ── Stat Bar Row ──────────────────────────────────────────────────
function CompareStatBar({ label, val1, val2, rank1, rank2, icon }: {
    label: string; val1: number; val2: number; rank1: number; rank2: number; icon: string;
}) {
    const total = val1 + val2;
    const pct1 = total > 0 ? (val1 / total) * 100 : 50;
    const diff = Math.abs(val1 - val2);
    const winner = val1 > val2 ? 'user1' : val2 > val1 ? 'user2' : 'tie';
    return (
        <div className="compare-stat-bar-row">
            <div className="compare-stat-bar-header">
                <span>{label}</span>
                {winner !== 'tie' && (
                    <span className="compare-stat-bar-diff" style={{ color: winner === 'user1' ? '#D4BB6E' : '#C98A94' }}>
                        Δ {diff.toLocaleString()}
                    </span>
                )}
            </div>
            <div className="compare-stat-bar-values">
                <div className="compare-stat-bar-value" style={{ color: winner === 'user1' ? '#D4BB6E' : 'var(--seismic-gray-400)' }}>
                    <div className="compare-stat-bar-num"><AnimatedNumber value={val1} /></div>
                    <div className="compare-stat-bar-rank">#{rank1.toLocaleString()}</div>
                </div>
                <div className="compare-stat-bar-track">
                    <div className="compare-stat-bar-fill compare-stat-bar-fill-left"
                        style={{ width: `${pct1}%`, background: winner === 'user1' ? 'linear-gradient(90deg, transparent, #D4BB6E)' : 'var(--seismic-gray-800)' }} />
                    <div className="compare-stat-bar-fill compare-stat-bar-fill-right"
                        style={{ width: `${100 - pct1}%`, background: winner === 'user2' ? 'linear-gradient(270deg, transparent, #C98A94)' : 'var(--seismic-gray-800)' }} />
                </div>
                <div className="compare-stat-bar-value" style={{ textAlign: 'right', color: winner === 'user2' ? '#C98A94' : 'var(--seismic-gray-400)' }}>
                    <div className="compare-stat-bar-num"><AnimatedNumber value={val2} /></div>
                    <div className="compare-stat-bar-rank">#{rank2.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}

// ── Activity Timeline ─────────────────────────────────────────────
function ActivityTimeline({ user1, user2 }: { user1: SeismicUser; user2: SeismicUser }) {
    const formatDate = (d: string | null) => {
        if (!d) return 'N/A';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const daysSince = (d: string | null) => {
        if (!d) return null;
        return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
    };
    const items = [
        { label: 'Account Created', u1: user1.account_created, u2: user2.account_created },
        { label: 'Joined Server', u1: user1.joined_at, u2: user2.joined_at },
        { label: 'First Message', u1: user1.first_message_date, u2: user2.first_message_date },
        { label: 'Last Active', u1: user1.last_message_date, u2: user2.last_message_date },
    ];
    return (
        <div className="compare-timeline">
            {items.map((item, idx) => {
                const d1 = daysSince(item.u1);
                const d2 = daysSince(item.u2);
                const isEarlier1 = item.u1 && item.u2 ? new Date(item.u1) < new Date(item.u2) : null;
                const isLastActive = item.label === 'Last Active';
                return (
                    <div key={idx} className="compare-timeline-item">
                        <div className="compare-timeline-label">{item.label}</div>
                        <div className="compare-timeline-values">
                            <div className="compare-timeline-cell" style={{
                                borderColor: isLastActive
                                    ? (isEarlier1 === false ? 'rgba(212,187,110,0.4)' : 'transparent')
                                    : (isEarlier1 === true ? 'rgba(212,187,110,0.4)' : 'transparent')
                            }}>
                                <div className="compare-timeline-date">{formatDate(item.u1)}</div>
                                {d1 !== null && <div className="compare-timeline-ago">{d1}d ago</div>}
                            </div>
                            <div className="compare-timeline-dot"><div className="compare-timeline-dot-inner" /></div>
                            <div className="compare-timeline-cell" style={{
                                textAlign: 'right' as const,
                                borderColor: isLastActive
                                    ? (isEarlier1 === true ? 'rgba(201,138,148,0.4)' : 'transparent')
                                    : (isEarlier1 === false ? 'rgba(201,138,148,0.4)' : 'transparent')
                            }}>
                                <div className="compare-timeline-date">{formatDate(item.u2)}</div>
                                {d2 !== null && <div className="compare-timeline-ago">{d2}d ago</div>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Strength Analysis ─────────────────────────────────────────────
function StrengthAnalysis({ result }: { result: CompareResult }) {
    const { user1, user2 } = result;
    const mag1 = getMagnitude(user1.roles), mag2 = getMagnitude(user2.roles);
    const categories = [
        { name: 'Total Contributions', u1: user1.total_messages, u2: user2.total_messages },
        { name: 'Tweet Activity', u1: user1.tweet, u2: user2.tweet },
        { name: 'Art Contributions', u1: user1.art, u2: user2.art },
        { name: 'Total Chat*', u1: user1.general_chat + user1.devnet_chat + user1.report_chat, u2: user2.general_chat + user2.devnet_chat + user2.report_chat },
        { name: 'Magnitude Level', u1: mag1, u2: mag2 },
    ];
    const u1Wins = categories.filter(c => c.u1 > c.u2);
    const u2Wins = categories.filter(c => c.u2 > c.u1);
    const ties = categories.filter(c => c.u1 === c.u2);
    return (
        <div className="compare-strength-grid">
            <div className="compare-strength-column">
                <div className="compare-strength-header" style={{ color: '#D4BB6E' }}>
                    {(user1.display_name || user1.username).split('#')[0]}&apos;s Edge
                </div>
                {u1Wins.length > 0 ? u1Wins.map((c, i) => (
                    <div key={i} className="compare-strength-item compare-strength-item-gold">
                        <span>{c.name}</span>
                        <span className="compare-strength-diff">+{(c.u1 - c.u2).toLocaleString()}</span>
                    </div>
                )) : <div className="compare-strength-empty">No advantages</div>}
            </div>
            {ties.length > 0 && (
                <div className="compare-strength-column compare-strength-ties">
                    <div className="compare-strength-header" style={{ color: 'var(--seismic-gray-400)' }}>Tied</div>
                    {ties.map((c, i) => (
                        <div key={i} className="compare-strength-item">
                            <span>{c.name}</span>
                            <span className="compare-strength-diff" style={{ color: 'var(--seismic-gray-500)' }}>=</span>
                        </div>
                    ))}
                </div>
            )}
            <div className="compare-strength-column">
                <div className="compare-strength-header" style={{ color: '#C98A94' }}>
                    {(user2.display_name || user2.username).split('#')[0]}&apos;s Edge
                </div>
                {u2Wins.length > 0 ? u2Wins.map((c, i) => (
                    <div key={i} className="compare-strength-item compare-strength-item-mauve">
                        <span>{c.name}</span>
                        <span className="compare-strength-diff">+{(c.u2 - c.u1).toLocaleString()}</span>
                    </div>
                )) : <div className="compare-strength-empty">No advantages</div>}
            </div>
            <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: 8, fontStyle: 'italic', textAlign: 'center', width: '100%', gridColumn: '1 / -1' }}>
                * Excludes Magnitude chat
            </div>
        </div>
    );
}

// ── Role Comparison ───────────────────────────────────────────────
function RoleComparison({ user1, user2 }: { user1: SeismicUser; user2: SeismicUser }) {
    const filterRoles = (roles: string[] | null) => {
        if (!roles) return [];
        return roles.filter(r => !r.startsWith('@everyone') && r !== 'Verified');
    };
    const roles1 = filterRoles(user1.roles), roles2 = filterRoles(user2.roles);
    const sharedRoles = roles1.filter(r => roles2.includes(r));
    const unique1 = roles1.filter(r => !roles2.includes(r));
    const unique2 = roles2.filter(r => !roles1.includes(r));
    const RoleBadge = ({ role, variant }: { role: string; variant: 'gold' | 'mauve' | 'shared' }) => {
        const colors = {
            gold: { bg: 'rgba(212,187,110,0.1)', border: 'rgba(212,187,110,0.3)', color: '#D4BB6E' },
            mauve: { bg: 'rgba(201,138,148,0.1)', border: 'rgba(201,138,148,0.3)', color: '#C98A94' },
            shared: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', color: 'var(--seismic-gray-300)' },
        };
        const c = colors[variant];
        return (
            <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem',
                background: c.bg, border: `1px solid ${c.border}`, color: c.color, lineHeight: 1.5
            }}>{role}</span>
        );
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sharedRoles.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--seismic-gray-500)', marginBottom: 8 }}>Shared Roles ({sharedRoles.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {sharedRoles.map(r => <RoleBadge key={r} role={r} variant="shared" />)}
                    </div>
                </div>
            )}
            <div className="compare-roles-grid">
                <div>
                    <div style={{ fontSize: '0.75rem', color: '#D4BB6E', marginBottom: 8 }}>Unique to {(user1.display_name || user1.username).split('#')[0]} ({unique1.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {unique1.length > 0 ? unique1.map(r => <RoleBadge key={r} role={r} variant="gold" />) :
                            <span style={{ fontSize: '0.8rem', color: 'var(--seismic-gray-600)' }}>None</span>}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: '#C98A94', marginBottom: 8 }}>Unique to {(user2.display_name || user2.username).split('#')[0]} ({unique2.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {unique2.length > 0 ? unique2.map(r => <RoleBadge key={r} role={r} variant="mauve" />) :
                            <span style={{ fontSize: '0.8rem', color: 'var(--seismic-gray-600)' }}>None</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Quick Stat ────────────────────────────────────────────────────
function QuickStat({ label, val1, val2 }: { label: string; val1: string | number; val2: string | number }) {
    return (
        <div className="compare-quick-stat">
            <div className="compare-quick-stat-label">{label}</div>
            <div className="compare-quick-stat-values">
                <span style={{ color: '#D4BB6E', fontWeight: 600 }}>{val1}</span>
                <span style={{ color: 'var(--seismic-gray-600)' }}>vs</span>
                <span style={{ color: '#C98A94', fontWeight: 600 }}>{val2}</span>
            </div>
        </div>
    );
}

function calcAvgPerDay(user: SeismicUser): string {
    if (!user.first_message_date || user.total_messages === 0) return '0';
    const days = Math.max(1, Math.floor((Date.now() - new Date(user.first_message_date).getTime()) / (1000 * 60 * 60 * 24)));
    return (user.total_messages / days).toFixed(1);
}

function getPercentile(rank: number, total: number) {
    if (total <= 0) return '0';
    return ((rank / total) * 100).toFixed(1);
}

// ── Player Card (reusable) ────────────────────────────────────────
function PlayerCard({ user, rank, totalUsers, isWinner, variant }: {
    user: SeismicUser; rank: { total: number; tweet: number; art: number };
    totalUsers: number; isWinner: boolean; variant: 'gold' | 'mauve';
}) {
    return (
        <div className={`compare-player-card compare-player-card-${variant}`}>
            <div className="compare-player-avatar-wrapper">
                <div className="avatar avatar-lg compare-player-avatar">
                    {user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.username[0].toUpperCase()}
                </div>
                {isWinner && <div className="compare-player-crown">👑</div>}
            </div>
            <h3 className="compare-player-name">{user.display_name || user.username}</h3>
            <div className="compare-player-mag">
                {getHighestMagnitudeRole(user.roles) && (
                    <img src={getRoleIconPath(getHighestMagnitudeRole(user.roles))!} alt="" style={{ width: 22, height: 22 }} />
                )}
                Magnitude {getMagnitude(user.roles)}.0
            </div>
            <div className="compare-player-rank">
                Rank #{rank.total.toLocaleString()}
                <span className="compare-player-percentile">Top {getPercentile(rank.total, totalUsers)}%</span>
            </div>
        </div>
    );
}

// ── Watermark ─────────────────────────────────────────────────────
function Watermark() {
    return (
        <div className="compare-watermark">
            <span style={{ opacity: 0.7, fontStyle: 'italic' }}>cooked by</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>RizzDroop23</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.911 13.911 0 0 0-.613 1.257 18.067 18.067 0 0 0-5.467 0 14.155 14.155 0 0 0-.616-1.257.073.073 0 0 0-.079-.037 19.535 19.535 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
                </svg>
                <span>rizzgm</span>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function CompareUsers() {
    // ── State ─────────────────────────────────────────────────────
    const [phase, setPhase] = useState<Phase>('search');
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SeismicUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<SeismicUser | null>(null);
    const [opponent, setOpponent] = useState<SeismicUser | null>(null);
    const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [revealCountdown, setRevealCountdown] = useState(3);
    const [shuffleNames, setShuffleNames] = useState<string[]>([]);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // ── Search ────────────────────────────────────────────────────
    const searchUser = async (q: string) => {
        if (q.length < 2) { setSearchResults([]); return; }
        try {
            const { data, error } = await supabase
                .from('seismic_dc_user').select('*')
                .ilike('username', `%${q}%`)
                .eq('is_bot', false)
                .order('total_messages', { ascending: false })
                .limit(6);
            if (error) throw error;
            setSearchResults((data as SeismicUser[]) || []);
        } catch { setSearchResults([]); }
    };

    const handleQueryChange = (value: string) => {
        setQuery(value); setSelectedUser(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchUser(value), 300);
    };

    const selectUser = (user: SeismicUser) => {
        setSelectedUser(user);
        setQuery(user.username);
        setSearchResults([]);
    };

    // ── Find Random Opponent ──────────────────────────────────────
    const findRandomOpponent = async () => {
        if (!selectedUser) return;
        setPhase('finding-opponent');
        setLoading(true);

        try {
            // Get some random names for the shuffle animation
            const { data: namesData } = await supabase
                .from('seismic_dc_user').select('username, display_name')
                .eq('is_bot', false)
                .gt('total_messages', 5)
                .neq('x_username', 'i')
                .limit(100);

            const names = ((namesData || []) as { username: string; display_name: string | null }[])
                .filter(u => u.username !== selectedUser.username)
                .map(u => u.display_name || u.username);

            setShuffleNames(names.length > 0 ? names : ['???']);

            // Get total count for random offset
            const { count } = await supabase
                .from('seismic_dc_user').select('id', { count: 'exact', head: true })
                .eq('is_bot', false)
                .gt('total_messages', 5)
                .neq('user_id', selectedUser.user_id)
                .neq('x_username', 'i');

            if (!count || count === 0) throw new Error('No opponents');

            // Pick a random user
            const randomOffset = Math.floor(Math.random() * count);
            const { data: randomData, error } = await supabase
                .from('seismic_dc_user').select('*')
                .eq('is_bot', false)
                .gt('total_messages', 5)
                .neq('user_id', selectedUser.user_id)
                .neq('x_username', 'i')
                .order('total_messages', { ascending: false })
                .range(randomOffset, randomOffset);

            if (error || !randomData || randomData.length === 0) throw new Error('No opponent found');

            const opp = randomData[0] as SeismicUser;
            setOpponent(opp);

            // Start the reveal countdown
            setPhase('reveal');
            setRevealCountdown(3);

        } catch (e) {
            console.error(e);
            setPhase('search');
        } finally {
            setLoading(false);
        }
    };

    // ── Reveal countdown ──────────────────────────────────────────
    useEffect(() => {
        if (phase !== 'reveal') return;
        if (revealCountdown <= 0) {
            // Start comparison
            runComparison();
            return;
        }
        const timer = setTimeout(() => setRevealCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [phase, revealCountdown]);

    // ── Run comparison ────────────────────────────────────────────
    const runComparison = async () => {
        if (!selectedUser || !opponent) return;
        setLoading(true);
        try {
            const [u1Total, u1Tweet, u1Art, u2Total, u2Tweet, u2Art, totalCount] = await Promise.all([
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('total_messages', selectedUser.total_messages),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('tweet', selectedUser.tweet),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('art', selectedUser.art),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('total_messages', opponent.total_messages),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('tweet', opponent.tweet),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('art', opponent.art),
                supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false),
            ]);
            setCompareResult({
                user1: selectedUser, user2: opponent,
                user1Rank: { total: (u1Total.count || 0) + 1, tweet: (u1Tweet.count || 0) + 1, art: (u1Art.count || 0) + 1 },
                user2Rank: { total: (u2Total.count || 0) + 1, tweet: (u2Tweet.count || 0) + 1, art: (u2Art.count || 0) + 1 },
                totalUsers: totalCount.count || 1,
            });
            setCurrentStep(0);
            setPhase('steps');
        } catch { /* ignore */ } finally { setLoading(false); }
    };

    // ── Step navigation ───────────────────────────────────────────
    const nextStep = () => {
        if (currentStep < TOTAL_STEPS - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setPhase('summary');
        }
    };
    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    // ── Reset ─────────────────────────────────────────────────────
    const resetAll = () => {
        setPhase('search');
        setQuery('');
        setSearchResults([]);
        setSelectedUser(null);
        setOpponent(null);
        setCompareResult(null);
        setCurrentStep(0);
    };

    // ── Winner ────────────────────────────────────────────────────
    const winner = useMemo(() => {
        if (!compareResult) return null;
        const { user1, user2 } = compareResult;
        const wins1 = [
            user1.total_messages > user2.total_messages,
            user1.tweet > user2.tweet,
            user1.art > user2.art,
        ].filter(Boolean).length;
        if (wins1 >= 2) return 'user1';
        if (wins1 <= 1) return 'user2';
        return user1.total_messages > user2.total_messages ? 'user1' : 'user2';
    }, [compareResult]);



    // ═══════════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════════

    // ── Phase: Search ─────────────────────────────────────────────
    if (phase === 'search') {
        return (
            <div className="compare-search-phase">
                <div className="compare-hero-card">
                    <h2 className="compare-hero-title">Enter Your Username</h2>
                    <p className="compare-hero-desc">
                        Type your Discord username and we&apos;ll find you a random opponent.
                    </p>

                    <div className="compare-search-wrapper">
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="input compare-hero-input"
                                placeholder="Search your Discord username..."
                                value={query}
                                onChange={(e) => handleQueryChange(e.target.value)}
                                autoFocus
                            />
                            {searchResults.length > 0 && (
                                <div className="compare-dropdown">
                                    {searchResults.map((user) => (
                                        <button key={user.id} onClick={() => selectUser(user)} className="compare-dropdown-item">
                                            <div className="avatar avatar-sm">
                                                {user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.username[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500 }}>{user.display_name || user.username}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--seismic-gray-500)' }}>
                                                    {user.total_messages.toLocaleString()} Contributions · Mag {getMagnitude(user.roles)}
                                                </div>
                                            </div>
                                            {getHighestMagnitudeRole(user.roles) && (
                                                <img src={getRoleIconPath(getHighestMagnitudeRole(user.roles))!} alt="" style={{ width: 20, height: 20 }} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedUser && (
                            <div className="compare-selected-user">
                                <div className="avatar avatar-md">
                                    {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" /> : selectedUser.username[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--seismic-white)' }}>
                                        {selectedUser.display_name || selectedUser.username}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--seismic-gray-500)' }}>
                                        {selectedUser.total_messages.toLocaleString()} Contributions · Magnitude {getMagnitude(selectedUser.roles)}.0
                                    </div>
                                </div>
                                {getHighestMagnitudeRole(selectedUser.roles) && (
                                    <img src={getRoleIconPath(getHighestMagnitudeRole(selectedUser.roles))!} alt=""
                                        style={{ width: 28, height: 28, marginLeft: 'auto' }} />
                                )}
                            </div>
                        )}

                        <button
                            className="compare-find-btn"
                            disabled={!selectedUser}
                            onClick={findRandomOpponent}
                        >
                            Find Random Opponent
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Phase: Finding Opponent (shuffle animation) ───────────────
    if (phase === 'finding-opponent') {
        return (
            <div className="compare-finding-phase">
                <div className="compare-finding-card">
                    <h2 className="compare-finding-title">Finding your opponent...</h2>
                    <div className="compare-shuffle-names">
                        <ShuffleText names={shuffleNames} />
                    </div>
                    <div className="compare-loading-pulse"><div /><div /><div /></div>
                </div>
            </div>
        );
    }

    // ── Phase: Reveal ─────────────────────────────────────────────
    if (phase === 'reveal' && selectedUser && opponent) {
        return (
            <div className="compare-reveal-phase">
                <div className="compare-reveal-card">
                    <div className="compare-reveal-countdown">
                        {revealCountdown > 0 ? (
                            <div className="compare-countdown-number">{revealCountdown}</div>
                        ) : (
                            <div className="compare-loading-pulse"><div /><div /><div /></div>
                        )}
                    </div>

                    <div className="compare-reveal-matchup">
                        <div className="compare-reveal-player">
                            <div className="avatar avatar-lg">
                                {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" /> : selectedUser.username[0].toUpperCase()}
                            </div>
                            <div className="compare-reveal-name">{selectedUser.display_name || selectedUser.username}</div>
                        </div>

                        <div className="compare-reveal-vs">VS</div>

                        <div className="compare-reveal-player">
                            <div className="avatar avatar-lg">
                                {opponent.avatar_url ? <img src={opponent.avatar_url} alt="" /> : opponent.username[0].toUpperCase()}
                            </div>
                            <div className="compare-reveal-name">{opponent.display_name || opponent.username}</div>
                        </div>
                    </div>

                    <div style={{ color: 'var(--seismic-gray-500)', fontSize: '0.85rem', marginTop: 16 }}>
                        Preparing analysis...
                    </div>
                </div>
            </div>
        );
    }

    // ── Phase: Steps ──────────────────────────────────────────────
    if (phase === 'steps' && compareResult) {
        return (
            <div className="compare-steps-phase fade-in">
                {/* Progress bar */}
                <div className="compare-step-progress">
                    <div className="compare-step-progress-bar">
                        <div className="compare-step-progress-fill" style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }} />
                    </div>
                    <div className="compare-step-progress-text">
                        Step {currentStep + 1} of {TOTAL_STEPS}
                    </div>
                </div>

                {/* Step title */}
                <div className="compare-step-title">{STEP_TITLES[currentStep]}</div>

                {/* Step content */}
                <div className="compare-step-content fade-in" key={currentStep}>
                    {currentStep === 0 && (
                        <StepMatchup result={compareResult} winner={winner} />
                    )}
                    {currentStep === 1 && (
                        <StepRadar result={compareResult} />
                    )}
                    {currentStep === 2 && (
                        <StepStats result={compareResult} />
                    )}
                    {currentStep === 3 && (
                        <StepTimeline result={compareResult} />
                    )}
                    {currentStep === 4 && (
                        <StepRolesStrengths result={compareResult} />
                    )}
                </div>

                {/* Navigation */}
                <div className="compare-step-nav">
                    <button
                        className="compare-step-btn compare-step-btn-prev"
                        onClick={prevStep}
                        disabled={currentStep === 0}
                    >
                        ← Previous
                    </button>

                    <div className="compare-step-dots">
                        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                            <div key={i} className={`compare-step-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`} />
                        ))}
                    </div>

                    <button className="compare-step-btn compare-step-btn-next" onClick={nextStep}>
                        {currentStep === TOTAL_STEPS - 1 ? 'View Full Summary →' : 'Next →'}
                    </button>
                </div>
            </div>
        );
    }

    // ── Phase: Summary (all at once) ──────────────────────────────
    if (phase === 'summary' && compareResult) {
        return (
            <div className="compare-summary-phase fade-in">
                <div className="compare-summary-header">
                    <h2>Full Summary</h2>
                    <div className="compare-summary-actions">
                        <button onClick={() => { setPhase('steps'); setCurrentStep(0); }} className="compare-step-btn compare-step-btn-prev">
                            ← Review Steps
                        </button>
                        <button onClick={resetAll} className="compare-step-btn compare-step-btn-prev">
                            New Battle
                        </button>
                    </div>
                </div>

                {/* Battle Card Image (Canvas) — Download / Copy / Share */}
                <div style={{ marginBottom: 32 }}>
                    <BattleCardImage
                        user1={compareResult.user1}
                        user2={compareResult.user2}
                        user1Rank={compareResult.user1Rank}
                        user2Rank={compareResult.user2Rank}
                        totalUsers={compareResult.totalUsers}
                        winner={winner as 'user1' | 'user2' | null}
                    />
                </div>

                {/* Detailed Analysis */}
                <div className="compare-results" style={{ backgroundColor: '#0e0e0e' }}>
                    {/* Winner Banner */}
                    <div className="compare-winner-banner">
                        <div className="compare-winner-crown">👑</div>
                        <div className="compare-winner-text">
                            <span style={{ color: winner === 'user1' ? '#D4BB6E' : '#C98A94', fontWeight: 700 }}>
                                {winner === 'user1'
                                    ? (compareResult.user1.display_name || compareResult.user1.username)
                                    : (compareResult.user2.display_name || compareResult.user2.username)}
                            </span>{' '}wins the battle!
                        </div>
                    </div>

                    {/* Players */}
                    <div className="compare-players-header">
                        <PlayerCard user={compareResult.user1} rank={compareResult.user1Rank}
                            totalUsers={compareResult.totalUsers} isWinner={winner === 'user1'} variant="gold" />
                        <div className="compare-battle-vs">
                            <span style={{ color: 'var(--seismic-gray-600)', fontWeight: 800, letterSpacing: 2 }}>VS</span>
                        </div>
                        <PlayerCard user={compareResult.user2} rank={compareResult.user2Rank}
                            totalUsers={compareResult.totalUsers} isWinner={winner === 'user2'} variant="mauve" />
                    </div>

                    {/* All sections */}
                    <div className="compare-tab-content">
                        <div className="compare-section">
                            <div className="compare-section-title">Power Radar</div>
                            <div className="compare-radar-wrapper">
                                <RadarChart user1={compareResult.user1} user2={compareResult.user2}
                                    totalUsers={compareResult.totalUsers}
                                    u1Rank={compareResult.user1Rank} u2Rank={compareResult.user2Rank} />
                                <div className="compare-radar-legend">
                                    <div className="compare-radar-legend-item">
                                        <span className="compare-radar-legend-dot" style={{ background: '#D4BB6E' }} />
                                        {(compareResult.user1.display_name || compareResult.user1.username).split('#')[0]}
                                    </div>
                                    <div className="compare-radar-legend-item">
                                        <span className="compare-radar-legend-dot" style={{ background: '#C98A94' }} />
                                        {(compareResult.user2.display_name || compareResult.user2.username).split('#')[0]}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="compare-section">
                            <div className="compare-section-title">Head-to-Head Stats</div>
                            <div className="compare-stat-bars">
                                <CompareStatBar label="Total Contributions" val1={compareResult.user1.total_messages} val2={compareResult.user2.total_messages}
                                    rank1={compareResult.user1Rank.total} rank2={compareResult.user2Rank.total} icon="" />
                                <CompareStatBar label="Tweet Activity" val1={compareResult.user1.tweet} val2={compareResult.user2.tweet}
                                    rank1={compareResult.user1Rank.tweet} rank2={compareResult.user2Rank.tweet} icon="" />
                                <CompareStatBar label="Art Contributions" val1={compareResult.user1.art} val2={compareResult.user2.art}
                                    rank1={compareResult.user1Rank.art} rank2={compareResult.user2Rank.art} icon="" />
                                <CompareStatBar label="Total Chat*"
                                    val1={compareResult.user1.general_chat + compareResult.user1.devnet_chat + compareResult.user1.report_chat}
                                    val2={compareResult.user2.general_chat + compareResult.user2.devnet_chat + compareResult.user2.report_chat}
                                    rank1={0} rank2={0} icon="" />
                            </div>
                        </div>

                        <div className="compare-section">
                            <div className="compare-section-title">Activity Timeline</div>
                            <div className="compare-timeline-header">
                                <span style={{ color: '#D4BB6E' }}>{(compareResult.user1.display_name || compareResult.user1.username).split('#')[0]}</span>
                                <span style={{ color: '#C98A94' }}>{(compareResult.user2.display_name || compareResult.user2.username).split('#')[0]}</span>
                            </div>
                            <ActivityTimeline user1={compareResult.user1} user2={compareResult.user2} />
                        </div>

                        <div className="compare-section">
                            <div className="compare-section-title">Strengths & Advantages</div>
                            <StrengthAnalysis result={compareResult} />
                        </div>

                        <div className="compare-section">
                            <div className="compare-section-title">Role Comparison</div>
                            <RoleComparison user1={compareResult.user1} user2={compareResult.user2} />
                        </div>

                        <div className="compare-section">
                            <div className="compare-section-title">Engagement Stats</div>
                            <div className="compare-quick-stats">
                                <QuickStat label="Avg Contributions/Day" val1={calcAvgPerDay(compareResult.user1)} val2={calcAvgPerDay(compareResult.user2)} />
                                <QuickStat label="Total Chat*"
                                    val1={(compareResult.user1.general_chat + compareResult.user1.devnet_chat + compareResult.user1.report_chat).toLocaleString()}
                                    val2={(compareResult.user2.general_chat + compareResult.user2.devnet_chat + compareResult.user2.report_chat).toLocaleString()} />
                                <QuickStat label="Tweet ratio"
                                    val1={compareResult.user1.total_messages > 0 ? ((compareResult.user1.tweet / compareResult.user1.total_messages) * 100).toFixed(1) + '%' : '0%'}
                                    val2={compareResult.user2.total_messages > 0 ? ((compareResult.user2.tweet / compareResult.user2.total_messages) * 100).toFixed(1) + '%' : '0%'} />
                                <QuickStat label="Art ratio"
                                    val1={compareResult.user1.total_messages > 0 ? ((compareResult.user1.art / compareResult.user1.total_messages) * 100).toFixed(1) + '%' : '0%'}
                                    val2={compareResult.user2.total_messages > 0 ? ((compareResult.user2.art / compareResult.user2.total_messages) * 100).toFixed(1) + '%' : '0%'} />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="compare-footer">
                        <Watermark />
                    </div>
                </div>
            </div>
        );
    }

    // Fallback
    return null;
}

// ═══════════════════════════════════════════════════════════════════
//  STEP VIEWS
// ═══════════════════════════════════════════════════════════════════

function StepMatchup({ result, winner }: { result: CompareResult; winner: string | null }) {
    return (
        <div className="compare-results" style={{ backgroundColor: '#0e0e0e' }}>
            <div className="compare-winner-banner">
                <div className="compare-winner-crown">👑</div>
                <div className="compare-winner-text">
                    <span style={{ color: winner === 'user1' ? '#D4BB6E' : '#C98A94', fontWeight: 700 }}>
                        {winner === 'user1'
                            ? (result.user1.display_name || result.user1.username)
                            : (result.user2.display_name || result.user2.username)}
                    </span>{' '}leads the battle!
                </div>
            </div>
            <div className="compare-players-header">
                <PlayerCard user={result.user1} rank={result.user1Rank}
                    totalUsers={result.totalUsers} isWinner={winner === 'user1'} variant="gold" />
                <div className="compare-battle-vs">
                    <span style={{ color: 'var(--seismic-gray-600)', fontWeight: 800, letterSpacing: 2 }}>VS</span>
                </div>
                <PlayerCard user={result.user2} rank={result.user2Rank}
                    totalUsers={result.totalUsers} isWinner={winner === 'user2'} variant="mauve" />
            </div>
        </div>
    );
}

function StepRadar({ result }: { result: CompareResult }) {
    return (
        <div className="compare-section">
            <div className="compare-radar-wrapper">
                <RadarChart user1={result.user1} user2={result.user2}
                    totalUsers={result.totalUsers}
                    u1Rank={result.user1Rank} u2Rank={result.user2Rank} />
                <div className="compare-radar-legend">
                    <div className="compare-radar-legend-item">
                        <span className="compare-radar-legend-dot" style={{ background: '#D4BB6E' }} />
                        {(result.user1.display_name || result.user1.username).split('#')[0]}
                    </div>
                    <div className="compare-radar-legend-item">
                        <span className="compare-radar-legend-dot" style={{ background: '#C98A94' }} />
                        {(result.user2.display_name || result.user2.username).split('#')[0]}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepStats({ result }: { result: CompareResult }) {
    return (
        <div className="compare-section">
            <div className="compare-stat-bars">
                <CompareStatBar label="Total Contributions" val1={result.user1.total_messages} val2={result.user2.total_messages}
                    rank1={result.user1Rank.total} rank2={result.user2Rank.total} icon="" />
                <CompareStatBar label="Tweet Activity" val1={result.user1.tweet} val2={result.user2.tweet}
                    rank1={result.user1Rank.tweet} rank2={result.user2Rank.tweet} icon="" />
                <CompareStatBar label="Art Contributions" val1={result.user1.art} val2={result.user2.art}
                    rank1={result.user1Rank.art} rank2={result.user2Rank.art} icon="" />
                <CompareStatBar label="Total Chat*"
                    val1={result.user1.general_chat + result.user1.devnet_chat + result.user1.report_chat}
                    val2={result.user2.general_chat + result.user2.devnet_chat + result.user2.report_chat}
                    rank1={0} rank2={0} icon="" />
            </div>
        </div>
    );
}

function StepTimeline({ result }: { result: CompareResult }) {
    return (
        <div className="compare-section">
            <div className="compare-timeline-header">
                <span style={{ color: '#D4BB6E' }}>{(result.user1.display_name || result.user1.username).split('#')[0]}</span>
                <span style={{ color: '#C98A94' }}>{(result.user2.display_name || result.user2.username).split('#')[0]}</span>
            </div>
            <ActivityTimeline user1={result.user1} user2={result.user2} />
            <div style={{ marginTop: 20 }}>
                <div className="compare-quick-stats">
                    <QuickStat label="Avg Contributions/Day" val1={calcAvgPerDay(result.user1)} val2={calcAvgPerDay(result.user2)} />
                    <QuickStat label="Total Chat*"
                        val1={(result.user1.general_chat + result.user1.devnet_chat + result.user1.report_chat).toLocaleString()}
                        val2={(result.user2.general_chat + result.user2.devnet_chat + result.user2.report_chat).toLocaleString()} />
                    <QuickStat label="Tweet ratio"
                        val1={result.user1.total_messages > 0 ? ((result.user1.tweet / result.user1.total_messages) * 100).toFixed(1) + '%' : '0%'}
                        val2={result.user2.total_messages > 0 ? ((result.user2.tweet / result.user2.total_messages) * 100).toFixed(1) + '%' : '0%'} />
                    <QuickStat label="Art ratio"
                        val1={result.user1.total_messages > 0 ? ((result.user1.art / result.user1.total_messages) * 100).toFixed(1) + '%' : '0%'}
                        val2={result.user2.total_messages > 0 ? ((result.user2.art / result.user2.total_messages) * 100).toFixed(1) + '%' : '0%'} />
                </div>
            </div>
        </div>
    );
}

function StepRolesStrengths({ result }: { result: CompareResult }) {
    return (
        <>
            <div className="compare-section" style={{ marginBottom: 20 }}>
                <div className="compare-section-title">Strengths & Advantages</div>
                <StrengthAnalysis result={result} />
            </div>
            <div className="compare-section">
                <div className="compare-section-title">Role Comparison</div>
                <RoleComparison user1={result.user1} user2={result.user2} />
            </div>
        </>
    );
}

// ── Shuffle Text Animation ────────────────────────────────────────
function ShuffleText({ names }: { names: string[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % names.length);
        }, 80);
        return () => clearInterval(interval);
    }, [names]);

    return (
        <div className="compare-shuffle-text">
            {names[currentIndex] || '???'}
        </div>
    );
}
