'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SeismicUser } from '@/types/database';
import TerminalLoader from '@/components/TerminalLoader';

export default function PromotionPage() {
    const [promotedUsers, setPromotedUsers] = useState<SeismicUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPromotions() {
            try {
                const { data, error } = await supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .eq('is_promoted', true)
                    .order('role_sabtu', { ascending: false });

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

    if (loading) {
        return <TerminalLoader />;
    }

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

                <h1 style={{
                    fontSize: '3.5rem',
                    fontWeight: 800,
                    marginBottom: 16,
                    background: 'linear-gradient(135deg, #fff 0%, #a5a5a5 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em'
                }}>
                    Weekly Promotions
                </h1>
                <p className="text-muted" style={{ fontSize: '1.2rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
                    Celebrating our standout community members who have leveled up their contribution magnitude this week.
                </p>
            </div>

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
                /* Grid */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 24
                }}>
                    {promotedUsers.map((user, index) => (
                        <div
                            key={user.id}
                            className="card"
                            style={{
                                padding: 0,
                                overflow: 'hidden',
                                animation: `fadeIn 0.5s ease-out forwards ${index * 0.1}s`,
                                opacity: 0,
                                transform: 'translateY(20px)',
                                border: '1px solid var(--seismic-gray-800)'
                            }}
                        >
                            {/* Banner/Header of Card */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(var(--seismic-primary-rgb), 0.08) 0%, rgba(var(--seismic-accent-rgb), 0.08) 100%)',
                                padding: '32px 24px 24px 24px',
                                borderBottom: '1px solid var(--seismic-gray-800)',
                                position: 'relative'
                            }}>
                                {/* Confetti/Sparkle decoration */}
                                <div style={{ position: 'absolute', top: 12, right: 12, fontSize: '1.2rem' }}>🎉</div>

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
                                    </div>
                                </div>
                            </div>

                            {/* Promotion Details */}
                            <div style={{ padding: 24 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 24,
                                    padding: '16px',
                                    background: 'var(--seismic-gray-900)',
                                    borderRadius: 'var(--border-radius)',
                                    border: '1px solid var(--seismic-gray-800)'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previous</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--seismic-gray-400)' }}>
                                            Mag {user.role_kamis !== null ? Number(user.role_kamis).toFixed(1) : '?'}
                                        </div>
                                    </div>

                                    <div style={{
                                        color: 'var(--seismic-primary)',
                                        fontSize: '1.25rem',
                                        opacity: 0.8
                                    }}>
                                        ➔
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--seismic-white)' }}>
                                            Mag {user.role_sabtu !== null ? Number(user.role_sabtu).toFixed(1) : '?'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    textAlign: 'center',
                                    padding: '12px',
                                    background: 'rgba(var(--seismic-primary-rgb), 0.1)',
                                    color: 'var(--seismic-primary)',
                                    borderRadius: 'var(--border-radius)',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    letterSpacing: '0.01em'
                                }}>
                                    Promoted this week! 🚀
                                </div>
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
