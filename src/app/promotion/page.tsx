'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SeismicUser } from '@/types/database';
import { LoaderFive } from "@/components/ui/loader";

import { getHighestMagnitudeRole } from '@/lib/roleUtils';
import { MAGNITUDE_COLORS } from '@/lib/constants';
import ElectricBorder from '@/components/ElectricBorder';
import { TypewriterEffect } from "@/components/ui/typewriter-effect";

export default function PromotionPage() {
    const [promotedUsers, setPromotedUsers] = useState<SeismicUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedGroup, setCopiedGroup] = useState<number | null>(null);

    useEffect(() => {
        async function fetchPromotions() {
            try {
                const { data, error } = await supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .eq('is_promoted', true)
                    .order('role_jumat', { ascending: false });

                if (error) throw error;
                setPromotedUsers(data || []);
            } catch (err) {
                console.error('Error fetching promotions:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchPromotions();
    }, []);

    const shareOnTwitter = (magnitude: number, users: SeismicUser[]) => {
        const xTags = users
            .filter(u => u.x_username)
            .map(u => `@${u.x_username}`)
            .join(' ');

        if (!xTags) {
            alert('No X usernames found for this group!');
            return;
        }

        const text = `Congratulations on your promotion to Magnitude ${magnitude}! 🥂\n\n${xTags}\n\nWell deserved! 🚀 #SeismicCommunity\n\nsource:\nhttps://x.com/RizzDroop23/status/2019850831378673743?s=20`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

        window.open(url, '_blank', 'noopener,noreferrer');
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <LoaderFive text="Loading Promotions..." />
            </div>
        );
    }

    // Group users by integer part of role_jumat (Magnitude)
    const groupedUsers: Record<number, SeismicUser[]> = {};
    promotedUsers.forEach(user => {
        let magValue = user.role_jumat;

        // Fallback: Calculate from roles if role_jumat is missing
        if (!magValue && user.roles) {
            const highestRole = getHighestMagnitudeRole(user.roles);
            if (highestRole) {
                const match = highestRole.match(/Magnitude (\d+(\.\d+)?)/);
                if (match) {
                    magValue = parseFloat(match[1]);
                }
            }
        }

        if (magValue) {
            const mag = Math.floor(magValue);
            if (mag >= 2 && mag <= 9) {
                if (!groupedUsers[mag]) {
                    groupedUsers[mag] = [];
                }
                groupedUsers[mag].push(user);
            }
        }
    });

    // Sort magnitudes descending
    const sortedMagnitudes = Object.keys(groupedUsers)
        .map(Number)
        .sort((a, b) => b - a);

    // Filter Top 3 Efficient Climbers
    // Criteria: Highest Role (Desc) -> Lowest Contributions (Asc)
    const efficientClimbers = [...promotedUsers]
        .sort((a, b) => {
            const roleA = a.role_jumat || 0;
            const roleB = b.role_jumat || 0;
            const roleDiff = roleB - roleA;
            if (roleDiff !== 0) return roleDiff;
            return a.total_messages - b.total_messages;
        })
        .slice(0, 3);

    return (
        <div className="container" style={{ padding: '40px 20px', maxWidth: 1200 }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 60, position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '600px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(var(--seismic-primary-rgb), 0.15) 0%, rgba(0,0,0,0) 70%)',
                    zIndex: -1,
                    filter: 'blur(40px)'
                }} />

                <TypewriterEffect
                    words={[
                        { text: "Weekly", className: "text-[var(--seismic-primary)]" },
                        { text: "Promotions", className: "text-[var(--seismic-primary)]" },
                    ]}
                    className="mb-4"
                    cursorClassName="bg-[var(--seismic-primary)]"
                />
                <p className="text-muted" style={{ fontSize: '1.2rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
                    Celebrating our standout community members who have leveled up their contribution magnitude this week.
                </p>
            </div>

            {/* Top Efficient Climbers Section */}
            {efficientClimbers.length > 0 && (
                <div style={{ marginBottom: 80 }}>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #fff 0%, #a5a5a5 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: 10,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 12
                        }}>

                            Efficient Climbers
                        </h2>
                        <p className="text-muted">Achieved the highest roles with minimal total volume. True efficiency!</p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: 24,
                        maxWidth: 1000,
                        margin: '0 auto'
                    }}>
                        {efficientClimbers.map((user, i) => {
                            const magVal = user.role_jumat ? Math.floor(user.role_jumat) : 0;
                            const color = MAGNITUDE_COLORS[magVal] || '#fff';

                            return (
                                <ElectricBorder
                                    key={user.id}
                                    color={color}
                                    className="card !border-0"
                                    borderRadius={16}
                                    style={{ overflow: 'hidden', height: '100%' }}
                                >
                                    <div style={{
                                        position: 'relative',
                                        padding: '24px',
                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 100%)',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center'
                                    }}>
                                        {/* Rank Badge */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            background: i === 0 ? '#fbbf24' : '#94a3b8',
                                            color: '#000',
                                            fontWeight: 800,
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.2rem',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                        }}>
                                            {i + 1}
                                        </div>

                                        <div className="avatar avatar-xl" style={{
                                            marginBottom: 16,
                                            width: 80,
                                            height: 80,
                                            border: `3px solid ${color}`
                                        }}>
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.username} crossOrigin="anonymous" />
                                            ) : (
                                                user.username[0].toUpperCase()
                                            )}
                                        </div>

                                        <h3 style={{ fontSize: '1.4rem', marginBottom: 4 }}>
                                            {user.display_name || user.username}
                                        </h3>
                                        <div className="text-muted" style={{ marginBottom: 20 }}>@{user.username}</div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: 12,
                                            width: '100%'
                                        }}>
                                            <div style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                padding: '12px',
                                                borderRadius: 12,
                                                border: `1px solid ${color}30`
                                            }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--seismic-gray-400)', marginBottom: 4 }}>Role</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: color }}>
                                                    Mag {magVal}
                                                </div>
                                            </div>
                                            <div style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                padding: '12px',
                                                borderRadius: 12,
                                                border: '1px solid var(--seismic-gray-700)'
                                            }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--seismic-gray-400)', marginBottom: 4 }}>Contributions</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                                                    {user.total_messages.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ElectricBorder>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {promotedUsers.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '80px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 24,
                    border: '1px dashed var(--seismic-gray-800)',
                    maxWidth: 600,
                    margin: '0 auto'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: 24, opacity: 0.5 }}>🌱</div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: 12, color: 'var(--seismic-white)' }}>Not Updated Yet</h3>
                    <p className="text-muted" style={{ maxWidth: 400, margin: '0 auto', fontSize: '1rem' }}>
                        We haven't recorded any promotions for this week yet. The data updates weekly, so please check back later!
                    </p>
                </div>
            ) : (
                /* Groups */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 60 }}>
                    {sortedMagnitudes.map((mag) => (
                        <div key={mag} id={`mag-${mag}`}>
                            <div className="promotion-header">
                                <h2 style={{
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    color: 'var(--seismic-white)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12
                                }}>
                                    <img
                                        src={`/icon_role/mag${mag}.webp`}
                                        alt={`Magnitude ${mag}`}
                                        style={{ height: 48, width: 'auto', objectFit: 'contain' }}
                                    />
                                    Magnitude {mag}
                                    <span style={{
                                        fontSize: '1rem',
                                        padding: '4px 12px',
                                        background: 'rgba(var(--seismic-primary-rgb), 0.1)',
                                        color: 'var(--seismic-primary)',
                                        borderRadius: 20
                                    }}>
                                        {groupedUsers[mag].length} promoted
                                    </span>
                                </h2>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => shareOnTwitter(mag, groupedUsers[mag])}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                    Share on X
                                </button>
                            </div>

                            <div className="grid-promotion">
                                {groupedUsers[mag].map((user, index) => (
                                    <ElectricBorder
                                        key={user.id}
                                        color={MAGNITUDE_COLORS[mag] || '#D4BB6E'}
                                        className="card !border-0"
                                        borderRadius={16}
                                        style={{
                                            padding: 0,
                                            overflow: 'hidden',
                                            animation: `fadeIn 0.5s ease-out forwards ${index * 0.1}s`,
                                            opacity: 0,
                                            transform: 'translateY(20px)',
                                        }}
                                    >
                                        {/* Banner/Header of Card */}
                                        <div style={{
                                            background: 'linear-gradient(135deg, rgba(var(--seismic-primary-rgb), 0.08) 0%, rgba(var(--seismic-accent-rgb), 0.08) 100%)',
                                            padding: '32px 24px 24px 24px',
                                            position: 'relative'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                                <div className="avatar avatar-xl" style={{ border: '3px solid var(--seismic-dark)' }}>
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.username} crossOrigin="anonymous" />
                                                    ) : (
                                                        user.username[0].toUpperCase()
                                                    )}
                                                </div>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <h3 style={{
                                                        fontSize: '1.35rem',
                                                        marginBottom: 6,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {user.display_name || user.username}
                                                    </h3>
                                                    <div className="text-muted" style={{ fontSize: '0.95rem' }}>@{user.username}</div>
                                                    {user.x_username && (
                                                        <div style={{
                                                            fontSize: '0.8rem',
                                                            color: 'var(--seismic-gray-400)',
                                                            marginTop: 4,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                                            @{user.x_username}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ElectricBorder>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx global>{`
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`}</style>
        </div>
    );
}
