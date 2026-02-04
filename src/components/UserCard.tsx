'use client';

import { SeismicUser } from '@/types/database';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getRoleIconPath, getHighestRoleIcon } from '@/lib/roleUtils';
import html2canvas from 'html2canvas';

interface UserCardProps {
    user: SeismicUser;
    showDownload?: boolean;
}

interface RankInfo {
    totalRank: number;
    tweetRank: number;
    artRank: number;
    totalUsers: number;
}

export default function UserCard({ user, showDownload = true }: UserCardProps) {
    const [rankInfo, setRankInfo] = useState<RankInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchRanks() {
            setLoading(true);
            try {
                const [totalRankResult, tweetRankResult, artRankResult, totalUsersResult] = await Promise.all([
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('total_messages', user.total_messages),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('tweet', user.tweet),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('art', user.art),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false),
                ]);

                setRankInfo({
                    totalRank: (totalRankResult.count || 0) + 1,
                    tweetRank: (tweetRankResult.count || 0) + 1,
                    artRank: (artRankResult.count || 0) + 1,
                    totalUsers: totalUsersResult.count || 1,
                });
            } catch (error) {
                console.error('Error fetching ranks:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRanks();
    }, [user]);

    const handleDownloadPNG = async () => {
        if (!cardRef.current) return;

        setDownloading(true);
        try {
            await new Promise(r => setTimeout(r, 100)); // Allow layout to stabilize if needed

            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#0a0a0a', // Force dark background
                scale: 2,
                useCORS: true,
                logging: false,
                width: cardRef.current.scrollWidth, // Capture full width
                height: cardRef.current.scrollHeight, // Capture full height
                onclone: (document) => {
                    // Hacky fix to force font smoothing or styles in clone if needed
                    const el = document.getElementById('card-capture-target');
                    if (el) el.style.fontFamily = 'Inter, system-ui, sans-serif';
                }
            });

            const link = document.createElement('a');
            link.download = `${user.username}-seismic-stats.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error generating PNG:', error);
        } finally {
            setDownloading(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getActivityDays = () => {
        if (!user.first_message_date || !user.last_message_date) return null;
        const first = new Date(user.first_message_date);
        const last = new Date(user.last_message_date);
        const days = Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 1;
    };

    const activityDays = getActivityDays();
    const messagesPerDay = activityDays ? (user.total_messages / activityDays).toFixed(1) : 'N/A';

    const getCurrentMagnitude = () => {
        const roles = user.roles || [];
        let highestMag = 0;
        const magnitudePattern = /^Magnitude (\d+\.?\d*)$/;

        roles.forEach(role => {
            const match = role.match(magnitudePattern);
            if (match) {
                const magValue = parseFloat(match[1]);
                if (magValue > highestMag) {
                    highestMag = magValue;
                }
            }
        });

        return highestMag;
    };

    const getNextMagnitudeInfo = () => {
        const currentMag = getCurrentMagnitude();
        if (currentMag >= 9) return null;

        const nextMag = Math.floor(currentMag) + 1;
        return {
            currentMagnitude: currentMag,
            nextMagnitude: nextMag,
        };
    };

    const getPercentile = () => {
        if (!rankInfo) return null;
        const percentile = ((rankInfo.totalUsers - rankInfo.totalRank) / rankInfo.totalUsers) * 100;
        return Math.max(0, Math.min(100, percentile)).toFixed(1);
    };

    const getAchievements = () => {
        const achievements: { label: string; color: string }[] = [];

        if (user.first_message_date && new Date(user.first_message_date) < new Date('2024-06-01')) {
            achievements.push({ label: 'Early Adopter', color: 'var(--seismic-primary)' });
        }

        if (activityDays && activityDays >= 30) {
            achievements.push({ label: 'Consistent', color: '#ef4444' });
        }

        if (user.total_messages > 0 && (user.art / user.total_messages) > 0.5) {
            achievements.push({ label: 'Art Lover', color: 'var(--seismic-accent)' });
        }

        if (user.total_messages > 0 && (user.tweet / user.total_messages) > 0.5) {
            achievements.push({ label: 'Tweet Master', color: 'var(--seismic-secondary)' });
        }

        if (user.total_messages >= 1000) {
            achievements.push({ label: 'Diamond Contributor', color: '#60a5fa' });
        }

        if (rankInfo && (rankInfo.totalRank / rankInfo.totalUsers) <= 0.1) {
            achievements.push({ label: 'Top 10%', color: '#fbbf24' });
        }

        return achievements;
    };

    const displayRoles = (user.roles || []).filter(
        role => !['[Left Server]', '[Not Fetched]', '[Bot]', 'No Roles'].includes(role)
    );

    const nextMagInfo = getNextMagnitudeInfo();
    const percentile = getPercentile();
    const achievements = getAchievements();

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* Download Button */}
            {/* Download Button */}
            {showDownload && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button
                        onClick={handleDownloadPNG}
                        disabled={downloading || loading}
                        className="btn btn-secondary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 16px',
                            fontSize: '0.875rem',
                        }}
                    >
                        {downloading ? (
                            <>
                                <div className="spinner" style={{ width: 14, height: 14 }} />
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Save as PNG
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Card Content - Fixed Layout for Capture */}
            <div
                ref={cardRef}
                id="card-capture-target"
                className="card"
                style={{
                    padding: 24,
                    backgroundColor: '#0e0e0e', // Explicit dark bg for PNG
                    minWidth: '500px', // Force width to prevent layout squashing
                    width: '100%',
                    fontFamily: 'sans-serif' // Fallback font
                }}
            >
                {/* User Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                    <div className="avatar avatar-xl">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} crossOrigin="anonymous" />
                        ) : (
                            user.username[0].toUpperCase()
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                            {user.display_name || user.username}
                            {getHighestRoleIcon(user.roles) && (
                                <img
                                    src={getHighestRoleIcon(user.roles)!}
                                    alt=""
                                    title="Highest Role"
                                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                                    crossOrigin="anonymous"
                                />
                            )}
                        </h2>
                        <div className="text-muted" style={{ fontSize: '1rem' }}>@{user.username}</div>
                        {user.joined_at && (
                            <div className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>
                                Joined {formatDate(user.joined_at)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Achievements - Fixed Colors */}
                {achievements.length > 0 && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 20,
                        padding: 12,
                        background: 'var(--seismic-gray-900)',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--seismic-gray-800)'
                    }}>
                        {achievements.map((ach, i) => (
                            <span
                                key={i}
                                className="badge"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: ach.color,
                                    border: `1px solid ${ach.color}`,
                                    fontSize: '0.75rem',
                                    padding: '4px 10px',
                                    // opacity: 0.9 removed to avoid text dimming
                                }}
                            >
                                {ach.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* Contribution Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    marginBottom: 24,
                    padding: 20,
                    background: 'var(--seismic-gray-800)',
                    borderRadius: 'var(--border-radius)',
                }}>
                    <div className="text-center">
                        <div className="stat-value text-primary">{user.total_messages.toLocaleString()}</div>
                        <div className="stat-label">Total Contributions</div>
                        {!loading && rankInfo && (
                            <div className="badge badge-primary" style={{ marginTop: 8 }}>
                                #{rankInfo.totalRank.toLocaleString()}
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="stat-value text-secondary">{user.tweet.toLocaleString()}</div>
                        <div className="stat-label">Tweets</div>
                        {!loading && rankInfo && (
                            <div className="badge badge-secondary" style={{ marginTop: 8 }}>
                                #{rankInfo.tweetRank.toLocaleString()}
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="stat-value text-accent">{user.art.toLocaleString()}</div>
                        <div className="stat-label">Art</div>
                        {!loading && rankInfo && (
                            <div className="badge badge-accent" style={{ marginTop: 8 }}>
                                #{rankInfo.artRank.toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Percentile Banner */}
                {!loading && percentile && (
                    <div style={{
                        textAlign: 'center',
                        padding: 16,
                        marginBottom: 24,
                        background: 'linear-gradient(135deg, var(--seismic-primary-dark) 0%, var(--seismic-accent) 100%)',
                        borderRadius: 'var(--border-radius)',
                        color: 'var(--seismic-white)'
                    }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: 4 }}>You are in the</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'monospace' }}>
                            Top {(100 - parseFloat(percentile)).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.8125rem', opacity: 0.8 }}>of all contributors</div>
                    </div>
                )}

                {/* Next Magnitude Target - No Emoji */}
                {nextMagInfo && (
                    <div style={{
                        marginBottom: 24,
                        padding: 16,
                        background: 'var(--seismic-gray-800)',
                        borderRadius: 'var(--border-radius)',
                        border: '1px dashed var(--seismic-primary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Current Level</div>
                                <h4 style={{ margin: 0, color: 'var(--seismic-primary)' }}>
                                    Magnitude {nextMagInfo.currentMagnitude}.0
                                </h4>
                            </div>
                            <div style={{ fontSize: '1.5rem', color: 'var(--seismic-gray-500)' }}>→</div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>Next Goal</div>
                                <h4 style={{ margin: 0, color: 'var(--seismic-white)' }}>
                                    Magnitude {nextMagInfo.nextMagnitude}.0
                                </h4>
                            </div>
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.8125rem', textAlign: 'center', marginTop: 12 }}>
                            Keep contributing to reach the next level!
                        </div>
                    </div>
                )}

                {/* Activity Breakdown */}
                <div style={{ marginBottom: 24 }}>
                    <h4 style={{ marginBottom: 16 }}>Activity Breakdown</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        <div style={{ padding: 16, background: 'var(--seismic-gray-800)', borderRadius: 'var(--border-radius-sm)' }}>
                            <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>First Activity</div>
                            <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                                {formatDate(user.first_message_date)}
                            </div>
                        </div>
                        <div style={{ padding: 16, background: 'var(--seismic-gray-800)', borderRadius: 'var(--border-radius-sm)' }}>
                            <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Last Activity</div>
                            <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                                {formatDate(user.last_message_date)}
                            </div>
                        </div>
                        <div style={{ padding: 16, background: 'var(--seismic-gray-800)', borderRadius: 'var(--border-radius-sm)' }}>
                            <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Active Days</div>
                            <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                                {activityDays ? `${activityDays} days` : 'N/A'}
                            </div>
                        </div>
                        <div style={{ padding: 16, background: 'var(--seismic-gray-800)', borderRadius: 'var(--border-radius-sm)' }}>
                            <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Avg. per Day</div>
                            <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                                {messagesPerDay} per day
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contribution Breakdown Bar */}
                <div style={{ marginBottom: 24 }}>
                    <h4 style={{ marginBottom: 12 }}>Contribution Breakdown</h4>
                    <div style={{
                        display: 'flex',
                        height: 12,
                        borderRadius: 6,
                        overflow: 'hidden',
                        background: 'var(--seismic-gray-800)'
                    }}>
                        {user.total_messages > 0 && (
                            <>
                                <div
                                    style={{
                                        width: `${(user.tweet / user.total_messages) * 100}%`,
                                        background: 'var(--seismic-secondary)',
                                    }}
                                    title={`Tweets: ${((user.tweet / user.total_messages) * 100).toFixed(1)}%`}
                                />
                                <div
                                    style={{
                                        width: `${(user.art / user.total_messages) * 100}%`,
                                        background: 'var(--seismic-accent)',
                                    }}
                                    title={`Art: ${((user.art / user.total_messages) * 100).toFixed(1)}%`}
                                />
                            </>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--seismic-secondary)' }} />
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                Tweet ({user.total_messages > 0 ? ((user.tweet / user.total_messages) * 100).toFixed(0) : 0}%)
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--seismic-accent)' }} />
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                Art ({user.total_messages > 0 ? ((user.art / user.total_messages) * 100).toFixed(0) : 0}%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Roles */}
                {displayRoles.length > 0 && (
                    <div>
                        <h4 style={{ marginBottom: 12 }}>Roles</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {displayRoles.slice(0, 10).map((role, i) => {
                                const iconPath = getRoleIconPath(role);
                                return (
                                    <span key={i} className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {iconPath && (
                                            <img
                                                src={iconPath}
                                                alt=""
                                                style={{ width: 14, height: 14, objectFit: 'contain' }}
                                                crossOrigin="anonymous"
                                            />
                                        )}
                                        {role}
                                    </span>
                                );
                            })}
                            {displayRoles.length > 10 && (
                                <span className="badge">+{displayRoles.length - 10} more</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Watermark for PNG */}
                <div style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: '1px solid var(--seismic-gray-800)',
                    textAlign: 'center'
                }}>
                    <span className="text-muted" style={{ fontSize: '0.6875rem' }}>
                        seismic.community • Generated {new Date().toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
}
