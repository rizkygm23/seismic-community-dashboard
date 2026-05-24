import { SeismicUser } from '@/types/database_manual';

export interface Badge {
    id: string;
    label: string;
    description: string;
    color: string;
    tier?: 'bronze' | 'silver' | 'gold' | 'achievement';
    achieved: boolean;
    style?: any; // For custom styles
}

export const BADGE_DEFINITIONS = [
    // --- GENERAL CHAT BADGES ---
    {
        id: 'gen-bronze',
        label: 'Echo',
        description: '1k+ General messages',
        color: '#825a6d',
        tier: 'bronze' as const,
        check: (u: SeismicUser) => u.general_chat >= 1000
    },
    {
        id: 'gen-silver',
        label: 'Resonance',
        description: '5k+ General messages',
        color: '#737373',
        tier: 'silver' as const,
        check: (u: SeismicUser) => u.general_chat >= 5000
    },
    {
        id: 'gen-gold',
        label: 'Shockwave',
        description: '10k+ General messages',
        color: '#523542',
        tier: 'gold' as const,
        check: (u: SeismicUser) => u.general_chat >= 10000
    },

    // --- DEVNET BADGES ---
    {
        id: 'dev-bronze',
        label: 'Test Subject',
        description: '100+ Devnet messages',
        color: '#a4a3a1',
        tier: 'bronze' as const,
        check: (u: SeismicUser) => u.devnet_chat >= 100
    },
    {
        id: 'dev-silver',
        label: 'Lab Tech',
        description: '300+ Devnet messages',
        color: '#825a6d',
        tier: 'silver' as const,
        check: (u: SeismicUser) => u.devnet_chat >= 300
    },
    {
        id: 'dev-gold',
        label: 'Architect',
        description: '500+ Devnet messages',
        color: '#523542',
        tier: 'gold' as const,
        check: (u: SeismicUser) => u.devnet_chat >= 500
    },

    // --- REPORT BADGES ---
    {
        id: 'rep-bronze',
        label: 'Vigilante',
        description: '10+ Reports',
        color: '#a4a3a1',
        tier: 'bronze' as const,
        check: (u: SeismicUser) => u.report_chat >= 10
    },
    {
        id: 'rep-silver',
        label: 'Sheriff',
        description: '30+ Reports',
        color: '#825a6d',
        tier: 'silver' as const,
        check: (u: SeismicUser) => u.report_chat >= 30
    },
    {
        id: 'rep-gold',
        label: 'Judge Dredd',
        description: '50+ Reports',
        color: '#523542',
        tier: 'gold' as const,
        check: (u: SeismicUser) => u.report_chat >= 50
    }
];

// Returns purely the tier-based badges defined above
export function getUserBadges(user: SeismicUser): Badge[] {
    return BADGE_DEFINITIONS.map(def => ({
        id: def.id,
        label: def.label,
        description: def.description,
        color: def.color,
        tier: def.tier,
        achieved: def.check(user)
    }));
}

export interface RankContext {
    rank: number;
    totalUsers: number;
}

// Returns the "Achievement" type badges (Tenure, Volume, etc.)
export function getUserAchievements(user: SeismicUser, rankContext?: RankContext): Badge[] {
    const achievements: Badge[] = [];
    const activityDays = (user.first_message_date && user.last_message_date)
        ? Math.max(1, Math.ceil((new Date(user.last_message_date).getTime() - new Date(user.first_message_date).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;

    // 1. Tenure
    if (user.first_message_date && new Date(user.first_message_date) < new Date('2024-06-01'))
        achievements.push({ id: 'early-adopter', label: 'Early Adopter', description: 'Joined before June 2024', color: '#161616', tier: 'achievement', achieved: true });

    if (activityDays >= 90)
        achievements.push({ id: 'veteran', label: 'Veteran', description: 'Active for 90+ days', color: '#737373', tier: 'achievement', achieved: true });
    else if (activityDays >= 30)
        achievements.push({ id: 'consistent', label: 'Consistent', description: 'Active for 30+ days', color: '#282826', tier: 'achievement', achieved: true });

    // 2. Volume
    if (user.total_messages >= 5000)
        achievements.push({ id: 'relentless', label: 'Relentless', description: '5000+ Total Messages', color: '#523542', tier: 'achievement', achieved: true });
    else if (user.total_messages >= 1000)
        achievements.push({ id: 'diamond', label: 'Diamond', description: '1000+ Total Messages', color: '#825a6d', tier: 'achievement', achieved: true });

    // 3. Specialization
    const artRatio = user.total_messages > 0 ? user.art / user.total_messages : 0;
    const tweetRatio = user.total_messages > 0 ? user.tweet / user.total_messages : 0;

    if (user.art >= 100)
        achievements.push({ id: 'artistic-soul', label: 'Artistic Soul', description: '100+ Art submissions', color: '#825a6d', tier: 'achievement', achieved: true });

    if (user.tweet >= 500)
        achievements.push({ id: 'voice-seismic', label: 'Voice of Seismic', description: '500+ Tweets', color: '#523542', tier: 'achievement', achieved: true });

    if (user.total_messages > 200 && artRatio >= 0.4 && tweetRatio >= 0.4)
        achievements.push({ id: 'balanced-force', label: 'Balanced Force', description: 'Balanced contributions', color: '#737373', tier: 'achievement', achieved: true });

    // 4. Rank
    if (rankContext) {
        const { rank, totalUsers } = rankContext;
        if ((rank / totalUsers) <= 0.01)
            achievements.push({ id: 'top-1-percent', label: 'Top 1% Elite', description: 'Top 1% Contributor', color: '#161616', tier: 'achievement', achieved: true });
        else if ((rank / totalUsers) <= 0.1)
            achievements.push({ id: 'top-10-percent', label: 'Top 10%', description: 'Top 10% Contributor', color: '#282826', tier: 'achievement', achieved: true });
    }

    // 5. Momentum
    const msgsPerDay = user.total_messages / activityDays;
    if (msgsPerDay > 15)
        achievements.push({ id: 'high-octane', label: 'High Octane', description: '>15 Msgs/Day', color: '#523542', tier: 'achievement', achieved: true });

    // Rising Star
    const joinedDays = user.joined_at
        ? Math.ceil((new Date().getTime() - new Date(user.joined_at).getTime()) / (1000 * 60 * 60 * 24))
        : activityDays;

    if (joinedDays < 45 && user.total_messages > 300)
        achievements.push({ id: 'rising-star', label: 'Rising Star', description: 'New but active', color: '#825a6d', tier: 'achievement', achieved: true });

    return achievements;
}

// Master function to get ALL badges (Tier + Achievements)
export function getAllUserBadges(user: SeismicUser, rankContext?: RankContext): Badge[] {
    const tierBadges = getUserBadges(user);
    const achievements = getUserAchievements(user, rankContext);
    return [...tierBadges, ...achievements];
}

export function getBadgeStyle(tier: 'bronze' | 'silver' | 'gold' | 'achievement' | undefined, baseColor: string, achieved: boolean) {
    if (!achieved) {
        return {
            background: 'var(--seismic-canvas)',
            border: '1px dashed var(--seismic-hairline)',
            color: 'var(--seismic-ash)',
            filter: 'grayscale(1)'
        };
    }

    // Default opacity for achievements
    let opacity = 0.15;
    let borderOpacity = 0.3;

    if (tier === 'gold') {
        opacity = 0.3;
        borderOpacity = 0.6;
    } else if (tier === 'silver') {
        opacity = 0.2;
        borderOpacity = 0.4;
    }

    return {
        background: `color-mix(in srgb, ${baseColor} ${Number(opacity) * 100}%, transparent)`,
        border: `1px solid color-mix(in srgb, ${baseColor} ${Number(borderOpacity) * 100}%, transparent)`,
        color: 'var(--seismic-ink)'
    };
}
