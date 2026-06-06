import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAllUserBadges } from '@/lib/badgeUtils';
import { LeaderboardUser, RegionDistribution, RoleDistribution, SeismicStatsSnapshot, SeismicUser } from '@/types/database_manual';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEADERBOARD_SELECT = 'id, user_id, username, x_username, display_name, avatar_url, roles, tweet, art, total_messages, general_chat, magnitude_chat, devnet_chat, report_chat, joined_at, first_message_date, last_message_date, region';

type ActionBody = {
    action?: string;
    [key: string]: unknown;
};

type CompareRankInput = {
    total_messages?: unknown;
    tweet?: unknown;
    art?: unknown;
};

function jsonError(error: string, status = 400) {
    return NextResponse.json({ error }, { status });
}

function asString(value: unknown) {
    return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback: number) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getCurrentMagnitude(roles: string[] | null | undefined) {
    let highestMag = 0;
    const magnitudePattern = /^Magnitude (\d+\.?\d*)$/;

    (roles || []).forEach((role) => {
        const match = role.match(magnitudePattern);
        if (match) {
            highestMag = Math.max(highestMag, parseFloat(match[1]));
        }
    });

    return highestMag;
}

function toLeaderboardUser(row: Partial<SeismicUser>, rank?: number, badgeCount?: number): LeaderboardUser {
    return {
        id: row.id || 0,
        user_id: row.user_id || '',
        username: row.username || '',
        x_username: row.x_username || null,
        display_name: row.display_name || null,
        avatar_url: row.avatar_url || null,
        roles: row.roles || null,
        total_messages: row.total_messages || 0,
        tweet: row.tweet || 0,
        art: row.art || 0,
        general_chat: row.general_chat || 0,
        magnitude_chat: row.magnitude_chat || 0,
        devnet_chat: row.devnet_chat || 0,
        report_chat: row.report_chat || 0,
        joined_at: row.joined_at || null,
        account_created: row.account_created || null,
        first_message_date: row.first_message_date || null,
        last_message_date: row.last_message_date || null,
        region: row.region || null,
        is_bot: row.is_bot || false,
        is_learned: row.is_learned || false,
        rank,
        badgeCount,
    };
}

async function getRoleDistribution() {
    const supabase = getSupabaseAdmin();
    const [verifiedCount, leaderCount] = await Promise.all([
        supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Verified']),
        supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Leader']),
    ]);

    const allRolesData: { roles: string[] | null }[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data: batch, error } = await supabase
            .from('seismic_dc_user')
            .select('roles')
            .eq('is_bot', false)
            .not('roles', 'is', null)
            .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (batch && batch.length > 0) {
            allRolesData.push(...batch);
            offset += batchSize;
            hasMore = batch.length === batchSize;
        } else {
            hasMore = false;
        }
    }

    const roleMap = new Map<string, number>();
    const magnitudePattern = /^Magnitude (\d+\.?\d*)$/;

    allRolesData.forEach((row) => {
        const userRoles = row.roles || [];
        let highestMagnitude: number | null = null;
        let highestMagnitudeRole: string | null = null;

        userRoles.forEach((role) => {
            const match = role.match(magnitudePattern);
            if (match) {
                const magValue = parseFloat(match[1]);
                if (highestMagnitude === null || magValue > highestMagnitude) {
                    highestMagnitude = magValue;
                    highestMagnitudeRole = role;
                }
            }
        });

        if (highestMagnitudeRole) {
            roleMap.set(highestMagnitudeRole, (roleMap.get(highestMagnitudeRole) || 0) + 1);
        }
    });

    if (verifiedCount.count && verifiedCount.count > 0) roleMap.set('Verified', verifiedCount.count);
    if (leaderCount.count && leaderCount.count > 0) roleMap.set('Leader', leaderCount.count);

    return Array.from(roleMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([role_name, user_count]) => ({ role_name, user_count }));
}

async function getGlobalRegions() {
    const supabase = getSupabaseAdmin();
    const regionMap = new Map<string, { user_count: number; total_contributions: number }>();
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('seismic_dc_user')
            .select('region, total_messages')
            .eq('is_bot', false)
            .not('region', 'is', null)
            .range(offset, offset + batchSize - 1);

        if (error) throw error;

        const rows = (data || []) as { region: string | null; total_messages: number | null }[];
        if (rows.length > 0) {
            rows.forEach((row) => {
                if (!row.region) return;
                const existing = regionMap.get(row.region) || { user_count: 0, total_contributions: 0 };
                existing.user_count += 1;
                existing.total_contributions += row.total_messages || 0;
                regionMap.set(row.region, existing);
            });

            offset += batchSize;
            hasMore = rows.length === batchSize;
        } else {
            hasMore = false;
        }
    }

    return Array.from(regionMap.entries())
        .map(([region, data]) => ({ region, ...data }))
        .sort((a, b) => b.user_count - a.user_count);
}

async function getUserCardRanks(user: Partial<SeismicUser>) {
    const supabase = getSupabaseAdmin();
    const currentMag = getCurrentMagnitude(user.roles);
    const roleString = `Magnitude ${currentMag}.0`;
    const totalMessages = user.total_messages || 0;
    const tweet = user.tweet || 0;
    const art = user.art || 0;

    const queries = [
        supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Magnitude 1.0']).gt('total_messages', totalMessages),
        supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Magnitude 1.0']).gt('tweet', tweet),
        supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Magnitude 1.0']).gt('art', art),
        supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).contains('roles', ['Magnitude 1.0']),
    ];

    if (currentMag > 0) {
        let roleQuery = supabase
            .from('seismic_dc_user')
            .select('id', { count: 'exact', head: true })
            .eq('is_bot', false)
            .contains('roles', [roleString])
            .gt('total_messages', totalMessages);

        if (currentMag < 10) {
            const nextMagString = `Magnitude ${currentMag + 1}.0`;
            roleQuery = roleQuery.not('roles', 'cs', `{"${nextMagString}"}`);
        }

        queries.push(roleQuery);
    }

    const results = await Promise.all(queries);

    return {
        totalRank: (results[0].count || 0) + 1,
        tweetRank: (results[1].count || 0) + 1,
        artRank: (results[2].count || 0) + 1,
        roleRank: currentMag > 0 && results[4] ? (results[4].count || 0) + 1 : null,
        totalUsers: results[3].count || 1,
    };
}

async function handleDiscordProfile(request: Request) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return jsonError('Missing auth token', 401);

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return jsonError('Invalid auth token', 401);

    const authUser = authData.user;
    const discordId = authUser.user_metadata.sub ||
        authUser.identities?.find((identity) => identity.provider === 'discord')?.identity_data?.sub;
    const username = authUser.user_metadata.custom_claims?.global_name ||
        authUser.user_metadata.full_name ||
        authUser.user_metadata.name ||
        null;

    if (discordId) {
        const { data, error } = await supabase
            .from('seismic_dc_user')
            .select('*')
            .eq('user_id', discordId)
            .single();

        if (!error && data) return NextResponse.json({ user: data, username });
    }

    if (username) {
        const { data } = await supabase
            .from('seismic_dc_user')
            .select('*')
            .ilike('username', username)
            .eq('is_bot', false)
            .order('total_messages', { ascending: false })
            .limit(1)
            .single();

        return NextResponse.json({ user: data || null, username });
    }

    return NextResponse.json({ user: null, username });
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as ActionBody;
        const action = asString(body.action);
        const supabase = getSupabaseAdmin();

        switch (action) {
            case 'discord-profile':
                return handleDiscordProfile(request);

            case 'leaderboard': {
                const page = Math.max(1, asNumber(body.page, 1));
                const limit = Math.min(50, Math.max(1, asNumber(body.limit, 25)));
                const { count: totalUsers, error: countError } = await supabase
                    .from('seismic_dc_user')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_bot', false);
                if (countError) throw countError;

                const { data, error } = await supabase
                    .from('seismic_dc_user')
                    .select(LEADERBOARD_SELECT)
                    .eq('is_bot', false)
                    .order('total_messages', { ascending: false })
                    .limit(1000);
                if (error) throw error;

                const rowsWithBadges = ((data || []) as Partial<SeismicUser>[]).map((row, index) => {
                    const userForBadges = toLeaderboardUser(row);
                    const badges = getAllUserBadges(userForBadges, { rank: index + 1, totalUsers: totalUsers || 1 });
                    return { ...row, badgeCount: badges.filter((badge) => badge.achieved).length };
                });

                rowsWithBadges.sort((a, b) => {
                    if ((b.badgeCount || 0) !== (a.badgeCount || 0)) return (b.badgeCount || 0) - (a.badgeCount || 0);
                    return (b.total_messages || 0) - (a.total_messages || 0);
                });

                const start = (page - 1) * limit;
                const users = rowsWithBadges
                    .slice(start, start + limit)
                    .map((row, index) => toLeaderboardUser(row, start + index + 1, row.badgeCount || 0));

                return NextResponse.json({ users, hasMore: start + limit < rowsWithBadges.length });
            }

            case 'stats-overview': {
                const [snapshotResult, topResult] = await Promise.all([
                    supabase.from('seismic_stats_snapshot').select('*').order('created_at', { ascending: false }).limit(1).single(),
                    supabase.from('seismic_dc_user').select('id, username, display_name, avatar_url, roles, total_messages').eq('is_bot', false).order('total_messages', { ascending: false }).limit(5),
                ]);

                const topRows = (topResult.data || []) as Array<{
                    id: number;
                    username: string;
                    display_name: string | null;
                    avatar_url: string | null;
                    roles: string[] | null;
                    total_messages: number;
                }>;
                const topContributors = topRows.map((row) => ({
                    id: row.id,
                    username: row.username,
                    display_name: row.display_name,
                    avatar_url: row.avatar_url,
                    roles: row.roles,
                    total: row.total_messages,
                }));

                return NextResponse.json({
                    snapshot: (snapshotResult.data || null) as SeismicStatsSnapshot | null,
                    topContributors,
                });
            }

            case 'roles':
                return NextResponse.json({ roles: await getRoleDistribution() satisfies RoleDistribution[] });

            case 'role-members': {
                const roleName = asString(body.roleName);
                if (!roleName) return jsonError('Missing roleName');

                const magnitudePattern = /^Magnitude (\d+\.?\d*)$/;
                const isMagnitudeRole = magnitudePattern.test(roleName);
                const selectedMagValue = isMagnitudeRole ? parseFloat(roleName.match(magnitudePattern)?.[1] || '0') : 0;
                let foundMembers: LeaderboardUser[] = [];
                let offset = 0;
                const batchSize = 1000;
                const hardLimit = 15000;

                while (foundMembers.length < 20) {
                    const { data, error } = await supabase
                        .from('seismic_dc_user')
                        .select(LEADERBOARD_SELECT)
                        .eq('is_bot', false)
                        .contains('roles', [roleName])
                        .order('total_messages', { ascending: false })
                        .range(offset, offset + batchSize - 1);
                    if (error) throw error;
                    if (!data || data.length === 0) break;

                    let validBatch = (data as Partial<SeismicUser>[]).map((row) => toLeaderboardUser(row));
                    if (isMagnitudeRole) {
                        validBatch = validBatch.filter((user) => getCurrentMagnitude(user.roles) === selectedMagValue);
                    }

                    foundMembers = [...foundMembers, ...validBatch];
                    if (foundMembers.length >= 20 || data.length < batchSize) break;
                    offset += batchSize;
                    if (offset >= hardLimit) break;
                }

                return NextResponse.json({ members: foundMembers.slice(0, 20) });
            }

            case 'compare-search': {
                const query = asString(body.query)?.trim() || '';
                if (query.length < 2) return NextResponse.json({ users: [] });

                const { data, error } = await supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .ilike('username', `%${query}%`)
                    .eq('is_bot', false)
                    .order('total_messages', { ascending: false })
                    .limit(6);
                if (error) throw error;

                return NextResponse.json({ users: data || [] });
            }

            case 'compare-opponent': {
                const selectedUserId = asString(body.selectedUserId);
                const selectedUsername = asString(body.selectedUsername);
                if (!selectedUserId || !selectedUsername) return jsonError('Missing selected user');

                const { data: namesData } = await supabase
                    .from('seismic_dc_user')
                    .select('username, display_name')
                    .eq('is_bot', false)
                    .gt('total_messages', 5)
                    .neq('x_username', 'i')
                    .limit(100);
                const names = ((namesData || []) as { username: string; display_name: string | null }[])
                    .filter((user) => user.username !== selectedUsername)
                    .map((user) => user.display_name || user.username);

                const { count } = await supabase
                    .from('seismic_dc_user')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_bot', false)
                    .gt('total_messages', 5)
                    .neq('user_id', selectedUserId)
                    .neq('x_username', 'i');
                if (!count) return jsonError('No opponents', 404);

                const randomOffset = Math.floor(Math.random() * count);
                const { data: randomData, error } = await supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .eq('is_bot', false)
                    .gt('total_messages', 5)
                    .neq('user_id', selectedUserId)
                    .neq('x_username', 'i')
                    .order('total_messages', { ascending: false })
                    .range(randomOffset, randomOffset);
                if (error) throw error;
                if (!randomData || randomData.length === 0) return jsonError('No opponent found', 404);

                return NextResponse.json({ names: names.length > 0 ? names : ['???'], opponent: randomData[0] });
            }

            case 'compare-ranks': {
                const user1 = body.user1 as CompareRankInput | undefined;
                const user2 = body.user2 as CompareRankInput | undefined;
                if (!user1 || !user2) return jsonError('Missing users');

                const [u1Total, u1Tweet, u1Art, u2Total, u2Tweet, u2Art, totalCount] = await Promise.all([
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('total_messages', asNumber(user1.total_messages, 0)),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('tweet', asNumber(user1.tweet, 0)),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('art', asNumber(user1.art, 0)),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('total_messages', asNumber(user2.total_messages, 0)),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('tweet', asNumber(user2.tweet, 0)),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false).gt('art', asNumber(user2.art, 0)),
                    supabase.from('seismic_dc_user').select('id', { count: 'exact', head: true }).eq('is_bot', false),
                ]);

                return NextResponse.json({
                    user1Rank: { total: (u1Total.count || 0) + 1, tweet: (u1Tweet.count || 0) + 1, art: (u1Art.count || 0) + 1 },
                    user2Rank: { total: (u2Total.count || 0) + 1, tweet: (u2Tweet.count || 0) + 1, art: (u2Art.count || 0) + 1 },
                    totalUsers: totalCount.count || 1,
                });
            }

            case 'global-regions':
                return NextResponse.json({ regions: await getGlobalRegions() satisfies RegionDistribution[] });

            case 'recent-activity': {
                const { data, error } = await supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .eq('is_bot', false)
                    .not('last_message_date', 'is', null)
                    .order('last_message_date', { ascending: false })
                    .limit(20);
                if (error) throw error;
                return NextResponse.json({ users: data || [] });
            }

            case 'user-details': {
                const username = asString(body.username);
                if (!username) return jsonError('Missing username');

                const { data, error } = await supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .eq('username', username)
                    .single();
                if (error && error.code !== 'PGRST116') throw error;
                return NextResponse.json({ user: data || null });
            }

            case 'user-card-ranks': {
                const user = body.user as Partial<SeismicUser> | undefined;
                if (!user) return jsonError('Missing user');
                return NextResponse.json({ rankInfo: await getUserCardRanks(user) });
            }

            default:
                return jsonError('Unknown action');
        }
    } catch (error) {
        console.error('Community API error:', error);
        const message = error instanceof Error ? error.message : 'Community API error';
        const status = message.includes('SERVICE_ROLE_KEY') ? 500 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
