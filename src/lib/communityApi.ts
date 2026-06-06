import { LeaderboardUser, RegionDistribution, RoleDistribution, SeismicStatsSnapshot, SeismicUser } from '@/types/database_manual';

export interface RankInfo {
    totalRank: number;
    tweetRank: number;
    artRank: number;
    roleRank: number | null;
    totalUsers: number;
}

export interface CommunityStatsPayload {
    snapshot: SeismicStatsSnapshot | null;
    topContributors: Array<{
        id: number;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        roles: string[] | null;
        total: number;
    }>;
}

export interface CompareOpponentPayload {
    names: string[];
    opponent: SeismicUser;
}

export interface CompareRanksPayload {
    user1Rank: { total: number; tweet: number; art: number };
    user2Rank: { total: number; tweet: number; art: number };
    totalUsers: number;
}

type RequestPayload = Record<string, unknown>;

async function communityRequest<T>(action: string, payload: RequestPayload = {}, accessToken?: string) {
    const response = await fetch('/api/community', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ action, ...payload }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        const message = body && typeof body.error === 'string'
            ? body.error
            : `Community API request failed: ${response.status}`;
        throw new Error(message);
    }

    return body as T;
}

export const communityApi = {
    getDiscordProfile(accessToken: string) {
        return communityRequest<{ user: SeismicUser | null; username: string | null }>('discord-profile', {}, accessToken);
    },

    getLeaderboard(page: number, limit: number) {
        return communityRequest<{ users: LeaderboardUser[]; hasMore: boolean }>('leaderboard', { page, limit });
    },

    getStatsOverview() {
        return communityRequest<CommunityStatsPayload>('stats-overview');
    },

    getRoles() {
        return communityRequest<{ roles: RoleDistribution[] }>('roles');
    },

    getRoleMembers(roleName: string) {
        return communityRequest<{ members: LeaderboardUser[] }>('role-members', { roleName });
    },

    getCompareSearch(query: string) {
        return communityRequest<{ users: SeismicUser[] }>('compare-search', { query });
    },

    getCompareOpponent(selectedUser: SeismicUser) {
        return communityRequest<CompareOpponentPayload>('compare-opponent', {
            selectedUserId: selectedUser.user_id,
            selectedUsername: selectedUser.username,
        });
    },

    getCompareRanks(user1: SeismicUser, user2: SeismicUser) {
        return communityRequest<CompareRanksPayload>('compare-ranks', {
            user1: {
                total_messages: user1.total_messages,
                tweet: user1.tweet,
                art: user1.art,
            },
            user2: {
                total_messages: user2.total_messages,
                tweet: user2.tweet,
                art: user2.art,
            },
        });
    },

    getGlobalRegions() {
        return communityRequest<{ regions: RegionDistribution[] }>('global-regions');
    },

    getRecentActivity() {
        return communityRequest<{ users: SeismicUser[] }>('recent-activity');
    },

    getUserDetails(username: string) {
        return communityRequest<{ user: SeismicUser | null }>('user-details', { username });
    },

    getUserCardRanks(user: SeismicUser) {
        return communityRequest<{ rankInfo: RankInfo }>('user-card-ranks', {
            user: {
                roles: user.roles,
                total_messages: user.total_messages,
                tweet: user.tweet,
                art: user.art,
            },
        });
    },
};
