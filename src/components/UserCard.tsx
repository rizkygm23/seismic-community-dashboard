'use client';
import GlareHover from './GlareHover'
import { SeismicUser } from '@/types/database_manual';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getRoleIconPath, getHighestRoleIcon } from '@/lib/roleUtils';
import { MAGNITUDE_COLORS, DEFAULT_THEME_COLOR } from '@/lib/constants';
import UserCardImage from './UserCardImage';
// @ts-ignore - Importing JS component
import ElectricBorder from './ElectricBorder';
import { getUserBadges, getBadgeStyle } from '@/lib/badgeUtils';

interface UserCardProps {
    user: SeismicUser;
    showDownload?: boolean;
    showProfileLink?: boolean;
    compact?: boolean;
    privacy?: boolean;
}

interface RankInfo {
    totalRank: number;
    tweetRank: number;
    artRank: number;
    roleRank: number | null;
    totalUsers: number;
}

export default function UserCard({ user, showDownload = true, showProfileLink = true, compact = false, privacy = false }: UserCardProps) {
    const [rankInfo, setRankInfo] = useState<RankInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCardImage, setShowCardImage] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);


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

    useEffect(() => {
        async function fetchRanks() {
            setLoading(true);
            try {
                const currentMag = getCurrentMagnitude();
                const roleString = `Magnitude ${currentMag}.0`;

                const queries = [
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Magnitude 1.0']).gt('total_messages', user.total_messages),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Magnitude 1.0']).gt('tweet', user.tweet),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Magnitude 1.0']).gt('art', user.art),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Magnitude 1.0']),
                ];

                if (currentMag > 0) {
                    let roleQuery = supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .contains('roles', [roleString])
                        .gt('total_messages', user.total_messages);

                    // Isolate rank to users where this is their HIGHEST role
                    // by excluding anyone who has the next magnitude
                    if (currentMag < 10) {
                        const nextMagString = `Magnitude ${currentMag + 1}.0`;
                        // Using strict string format for Postgres array comparison
                        roleQuery = roleQuery.not('roles', 'cs', `{"${nextMagString}"}`);
                    }

                    queries.push(roleQuery);
                }

                const results = await Promise.all(queries);

                const totalRankResult = results[0];
                const tweetRankResult = results[1];
                const artRankResult = results[2];
                const totalUsersResult = results[3];
                const roleRankResult = currentMag > 0 ? results[4] : null;

                setRankInfo({
                    totalRank: (totalRankResult.count || 0) + 1,
                    tweetRank: (tweetRankResult.count || 0) + 1,
                    artRank: (artRankResult.count || 0) + 1,
                    roleRank: roleRankResult ? (roleRankResult.count || 0) + 1 : null,
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
        return Math.max(0, Math.min(100, percentile)).toFixed(2);
    };

    const getAchievements = () => {
        const achievements: { label: string; color: string; priority: number }[] = [];
        const activityDays = (user.first_message_date && user.last_message_date)
            ? Math.max(1, Math.ceil((new Date(user.last_message_date).getTime() - new Date(user.first_message_date).getTime()) / (1000 * 60 * 60 * 24)))
            : 1;

        // 1. Tenure
        if (user.first_message_date && new Date(user.first_message_date) < new Date('2024-06-01'))
            achievements.push({ label: 'Early Adopter', color: '#fff', priority: 5 });

        if (activityDays >= 90)
            achievements.push({ label: 'Veteran', color: '#a3a3a3', priority: 3 });
        else if (activityDays >= 30)
            achievements.push({ label: 'Consistent', color: '#fff', priority: 2 });

        // 2. Volume
        if (user.total_messages >= 5000)
            achievements.push({ label: 'Relentless', color: '#ef4444', priority: 10 });
        else if (user.total_messages >= 1000)
            achievements.push({ label: 'Diamond', color: '#38bdf8', priority: 6 });

        // 3. Specialization
        const artRatio = user.total_messages > 0 ? user.art / user.total_messages : 0;
        const tweetRatio = user.total_messages > 0 ? user.tweet / user.total_messages : 0;

        if (user.art >= 100)
            achievements.push({ label: 'Artistic Soul', color: '#f472b6', priority: 4 });

        if (user.tweet >= 500)
            achievements.push({ label: 'Voice of Seismic', color: '#818cf8', priority: 4 });

        if (user.total_messages > 200 && artRatio >= 0.4 && tweetRatio >= 0.4)
            achievements.push({ label: 'Balanced Force', color: '#34d399', priority: 5 });

        // 4. Rank
        if (rankInfo && (rankInfo.totalRank / rankInfo.totalUsers) <= 0.01)
            achievements.push({ label: 'Top 1% Elite', color: '#fbbf24', priority: 20 });
        else if (rankInfo && (rankInfo.totalRank / rankInfo.totalUsers) <= 0.1)
            achievements.push({ label: 'Top 10%', color: '#fbbf24', priority: 8 });

        // 5. Momentum
        const msgsPerDay = user.total_messages / activityDays;
        if (msgsPerDay > 15)
            achievements.push({ label: 'High Octane', color: '#f59e0b', priority: 7 });

        // Rising Star
        const joinedDays = user.joined_at
            ? Math.ceil((new Date().getTime() - new Date(user.joined_at).getTime()) / (1000 * 60 * 60 * 24))
            : activityDays;

        if (joinedDays < 45 && user.total_messages > 300)
            achievements.push({ label: 'Rising Star', color: '#facc15', priority: 9 });

        return achievements.sort((a, b) => b.priority - a.priority).slice(0, 5);
    };



    const displayRoles = (user.roles || []).filter(
        role => !['[Left Server]', '[Not Fetched]', '[Bot]', 'No Roles'].includes(role)
    );

    const nextMagInfo = getNextMagnitudeInfo();
    const percentile = getPercentile();
    const achievements = getAchievements();

    // Get theme color based on user's highest magnitude
    const currentMag = getCurrentMagnitude();
    const themeColor = MAGNITUDE_COLORS[Math.floor(currentMag)] || DEFAULT_THEME_COLOR;

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <GlareHover
                ref={cardRef}
                id="card-capture-target"
                className={`card ${compact ? 'user-card-compact' : 'user-card-main'}`}
                width="100%"
                height="auto"
                background={`color-mix(in srgb, ${themeColor} 15%, #0a0a0a)`}
                borderColor={`${themeColor}80`}
                borderRadius="var(--border-radius)"
                glareColor={themeColor}
                glareOpacity={0.6}
                style={{
                    padding: compact ? 16 : 24,
                    fontFamily: 'sans-serif',
                    borderWidth: '2px', // Overrides GlareHover.css 1px border
                    boxShadow: `0 0 30px ${themeColor}30, 0 0 60px ${themeColor}15`,
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'default', // Override pointer on hover
                }}
            >
                {/* User Header */}
                <div className="user-card-header" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <ElectricBorder
                        color={themeColor}
                        speed={3}
                        chaos={0.06}
                        thickness={2}
                        borderRadius={48} // Circular
                        style={{ width: 'fit-content', height: 'fit-content' }}
                        className=""
                    >
                        <div className="avatar avatar-xl" style={{ border: 'none' }}>
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.username} crossOrigin="anonymous" style={{ borderRadius: '50%' }} />
                            ) : (
                                user.username[0].toUpperCase()
                            )}
                        </div>
                    </ElectricBorder>

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                            {user.joined_at && (
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    Joined {formatDate(user.joined_at)}
                                </div>
                            )}
                            {user.region && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    background: `${themeColor}30`,
                                    border: `1px solid ${themeColor}50`,
                                    borderRadius: 'var(--border-radius-sm)',
                                    color: themeColor,
                                }}>
                                    {user.region}
                                </div>
                            )}


                        </div>
                    </div>
                </div>

                {(achievements.length > 0 || getUserBadges(user).length > 0) && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 24,
                        padding: 12,
                        background: `color-mix(in srgb, ${themeColor} 10%, #151515)`,
                        borderRadius: 'var(--border-radius-sm)',
                        border: `1px solid ${themeColor}30`
                    }}>
                        {achievements.map((ach, i) => (
                            <span
                                key={`ach-${i}`}
                                className="badge"
                                style={{
                                    backgroundColor: `${ach.color}15`,
                                    color: ach.color,
                                    border: `1px solid ${ach.color}30`,
                                    fontSize: '0.75rem',
                                    padding: '4px 10px',
                                    fontWeight: 500
                                }}
                            >
                                {ach.label}
                            </span>
                        ))}
                        {getUserBadges(user).map((badge) => {
                            const isAch = badge.achieved;
                            const opacity = badge.tier === 'gold' ? 0.3 : badge.tier === 'silver' ? 0.2 : 0.15;
                            const borderOpacity = badge.tier === 'gold' ? 0.6 : badge.tier === 'silver' ? 0.4 : 0.3;

                            // Base style
                            let style = {
                                background: `color-mix(in srgb, ${badge.color} ${opacity * 100}%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${badge.color} ${borderOpacity * 100}%, transparent)`,
                                color: 'var(--seismic-white)',
                                opacity: 1,
                            };

                            // Override for unachieved
                            if (!isAch) {
                                style = {
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                                    color: 'rgba(255, 255, 255, 0.3)',
                                    opacity: 0.7,
                                };
                            }

                            return (
                                <span
                                    key={badge.id}
                                    className="badge"
                                    title={isAch ? badge.description : `${badge.description} (Not yet earned)`}
                                    style={{
                                        ...style,
                                        fontSize: '0.75rem',
                                        padding: '4px 10px',
                                        fontWeight: 500,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        cursor: 'help'
                                    }}
                                >
                                    <span>{badge.label}</span>
                                </span>
                            );
                        })}
                    </div>
                )}

                <div className="grid-stats" style={{
                    marginBottom: 24,
                    padding: 20,
                    background: `color-mix(in srgb, ${themeColor} 10%, #151515)`,
                    borderRadius: 'var(--border-radius)',
                    border: `1px solid ${themeColor}30`,
                }}>
                    <div className="text-center">
                        <div className="stat-value text-primary">{privacy ? '****' : user.total_messages.toLocaleString()}</div>
                        <div className="stat-label">Total Contributions</div>
                        {!loading && rankInfo && (
                            <div className="badge badge-primary" style={{ marginTop: 8 }}>
                                {privacy ? '#****' : `#${rankInfo.totalRank.toLocaleString()}`}
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="stat-value text-secondary">{privacy ? '****' : user.tweet.toLocaleString()}</div>
                        <div className="stat-label">Tweets</div>
                        {!loading && rankInfo && (
                            <div className="badge badge-secondary" style={{ marginTop: 8 }}>
                                {privacy ? '#****' : `#${rankInfo.tweetRank.toLocaleString()}`}
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="stat-value text-accent">{privacy ? '****' : user.art.toLocaleString()}</div>
                        <div className="stat-label">Art</div>
                        {!loading && rankInfo && (
                            <div className="badge badge-accent" style={{ marginTop: 8 }}>
                                {privacy ? '#****' : `#${rankInfo.artRank.toLocaleString()}`}
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="stat-value" style={{ color: '#60d394' }}>{privacy ? '****' : (user.general_chat + user.devnet_chat + user.report_chat).toLocaleString()}</div>
                        <div className="stat-label">Total Chat</div>
                        <div className="text-muted" style={{ fontSize: '0.6rem', marginTop: 2 }}>General + Devnet + Report only</div>
                    </div>
                </div>

                {/* Percentile Banner */}
                {!loading && percentile && !privacy && (
                    <div className="percentile-banner" style={{
                        textAlign: 'center',
                        padding: 14,
                        marginBottom: 16,
                        background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 50%, ${themeColor}99 100%)`,
                        borderRadius: 'var(--border-radius)',
                        color: 'var(--seismic-white)',
                        border: `1px solid ${themeColor}`,
                        boxShadow: `0 4px 20px ${themeColor}50`
                    }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.95, marginBottom: 4, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>You are in the</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'monospace', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                            Top {(100 - parseFloat(percentile)).toFixed(2)}%
                        </div>
                        <div style={{ fontSize: '0.8125rem', opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>of all contributors</div>
                    </div>

                )}

                {/* Encrypted Percentile Banner */}
                {!loading && percentile && privacy && (
                    <div className="percentile-banner" style={{
                        textAlign: 'center',
                        padding: 14,
                        marginBottom: 16,
                        background: `rgba(0,0,0,0.3)`,
                        borderRadius: 'var(--border-radius)',
                        color: 'var(--seismic-gray-400)',
                        border: `1px dashed var(--seismic-gray-700)`,
                    }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: 4 }}>Rank Percentile</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: 4 }}>
                            ****
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Encrypted for privacy</div>
                    </div>
                )}

                {/* Next Magnitude Target - No Emoji - Hidden in compact mode */}
                {!compact && nextMagInfo && (
                    <div style={{
                        marginBottom: 16,
                        padding: 14,
                        background: `color-mix(in srgb, ${themeColor} 8%, #151515)`,
                        borderRadius: 'var(--border-radius)',
                        border: `1px dashed ${themeColor}`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 6 }}>Current Level</div>
                                {getRoleIconPath(`Magnitude ${nextMagInfo.currentMagnitude}.0`) && (
                                    <img
                                        src={getRoleIconPath(`Magnitude ${nextMagInfo.currentMagnitude}.0`)!}
                                        alt={`Magnitude ${nextMagInfo.currentMagnitude}`}
                                        style={{ height: 40, width: 'auto', objectFit: 'contain' }}
                                        crossOrigin="anonymous"
                                    />
                                )}
                                {rankInfo?.roleRank && (
                                    <div className="badge badge-primary" style={{ marginTop: 8, fontSize: '0.7rem', padding: '2px 8px' }}>
                                        Rank #{rankInfo.roleRank}
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: '1.5rem', color: 'var(--seismic-gray-500)', marginTop: 12 }}>→</div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 6 }}>Next Goal</div>
                                {getRoleIconPath(`Magnitude ${nextMagInfo.nextMagnitude}.0`) && (
                                    <img
                                        src={getRoleIconPath(`Magnitude ${nextMagInfo.nextMagnitude}.0`)!}
                                        alt={`Magnitude ${nextMagInfo.nextMagnitude}`}
                                        style={{ height: 40, width: 'auto', objectFit: 'contain', opacity: 0.6 }}
                                        crossOrigin="anonymous"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.8125rem', textAlign: 'center', marginTop: 12 }}>
                            Keep contributing to reach the next level!
                        </div>
                    </div>
                )}


                {/* Extended Details - Only shown if not in compact mode */}
                {!compact && (
                    <>
                        {/* Activity Breakdown */}
                        <div style={{ marginBottom: 16 }}>
                            <h4 style={{ marginBottom: 12, color: themeColor, fontSize: '1rem' }}>Activity Breakdown</h4>
                            <div className="grid-activity">
                                <div style={{ padding: 16, background: `color-mix(in srgb, ${themeColor} 8%, #151515)`, borderRadius: 'var(--border-radius-sm)', border: `1px solid ${themeColor}20` }}>
                                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>First Activity</div>
                                    <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                                        {formatDate(user.first_message_date)}
                                    </div>
                                </div>
                                <div style={{ padding: 16, background: `color-mix(in srgb, ${themeColor} 8%, #151515)`, borderRadius: 'var(--border-radius-sm)', border: `1px solid ${themeColor}20` }}>
                                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Last Activity</div>
                                    <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                                        {formatDate(user.last_message_date)}
                                    </div>
                                </div>
                                <div style={{ padding: 16, background: `color-mix(in srgb, ${themeColor} 8%, #151515)`, borderRadius: 'var(--border-radius-sm)', border: `1px solid ${themeColor}20` }}>
                                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Active Days</div>
                                    <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                                        {activityDays ? `${activityDays} days` : 'N/A'}
                                    </div>
                                </div>
                                <div style={{ padding: 16, background: `color-mix(in srgb, ${themeColor} 8%, #151515)`, borderRadius: 'var(--border-radius-sm)', border: `1px solid ${themeColor}20` }}>
                                    <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: 4 }}>Avg. per Day</div>
                                    <div className="font-medium" style={{ color: 'var(--seismic-white)' }}>
                                        {privacy ? '****' : messagesPerDay} Contributions/Day
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contribution Breakdown Bar */}
                        <div style={{ marginBottom: 16 }}>
                            <h4 style={{ marginBottom: 10, color: themeColor, fontSize: '1rem' }}>Contribution Breakdown</h4>
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
                                                background: '#60a5fa', // Blue for Tweets
                                            }}
                                            title={`Tweets: ${((user.tweet / user.total_messages) * 100).toFixed(1)}%`}
                                        />
                                        <div
                                            style={{
                                                width: `${(user.art / user.total_messages) * 100}%`,
                                                background: '#f472b6', // Pink for Art
                                            }}
                                            title={`Art: ${((user.art / user.total_messages) * 100).toFixed(1)}%`}
                                        />
                                    </>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#60a5fa' }} />
                                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        Tweet ({user.total_messages > 0 ? ((user.tweet / user.total_messages) * 100).toFixed(0) : 0}%)
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f472b6' }} />
                                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        Art ({user.total_messages > 0 ? ((user.art / user.total_messages) * 100).toFixed(0) : 0}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Chat Breakdown */}
                        {(user.general_chat + user.devnet_chat + user.report_chat) > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <h4 style={{ marginBottom: 10, color: themeColor, fontSize: '1rem' }}>Chat Breakdown</h4>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 8,
                                }}>
                                    {[
                                        { label: 'General', value: user.general_chat, color: '#60d394' },
                                        { label: 'Devnet', value: user.devnet_chat, color: '#90b4f8' },
                                        { label: 'Report', value: user.report_chat, color: '#f48c8c' },
                                    ].map((ch) => (
                                        <div key={ch.label} style={{
                                            padding: 12,
                                            background: `color-mix(in srgb, ${themeColor} 8%, #151515)`,
                                            borderRadius: 'var(--border-radius-sm)',
                                            border: `1px solid ${themeColor}20`,
                                            textAlign: 'center',
                                        }}>
                                            <div className="font-medium" style={{ color: ch.color, fontSize: '1.1rem' }}>
                                                {privacy ? '****' : ch.value.toLocaleString()}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: 2 }}>{ch.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                    </>
                )}

                {/* Watermark for PNG - Hidden in compact mode */}
                <div style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid var(--seismic-gray-800)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--seismic-gray-500)',
                    fontSize: '0.75rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ opacity: 0.7, fontStyle: 'italic' }}>cooked by</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* Twitter/X Icon */}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span>RizzDroop23</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* Discord Icon */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.911 13.911 0 0 0-.613 1.257 18.067 18.067 0 0 0-5.467 0 14.155 14.155 0 0 0-.616-1.257.073.073 0 0 0-.079-.037 19.535 19.535 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
                            </svg>
                            <span>rizzgm</span>
                        </div>
                    </div>
                </div>
            </GlareHover>
            {
                !loading && rankInfo && (
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={() => setShowCardImage(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 20px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--seismic-gray-700)',
                                borderRadius: '12px',
                                color: 'var(--seismic-gray-300)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            title="Generate shareable card image"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            Save as Image
                        </button>
                    </div>
                )
            }

            {/* Card Image Modal */}
            {
                showCardImage && (
                    <div
                        className="modal-overlay"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowCardImage(false);
                        }}
                    >
                        <div style={{ maxWidth: 640, width: '100%', padding: '0 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                <button
                                    onClick={() => setShowCardImage(false)}
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.6)',
                                        border: '1px solid var(--seismic-gray-700)',
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--seismic-white)',
                                        fontSize: 16,
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                            <UserCardImage user={user} rankInfo={rankInfo} />
                        </div>
                    </div>
                )
            }
        </div >
    );
}
