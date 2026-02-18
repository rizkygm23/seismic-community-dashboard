const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '.env.local' });

// Environment variables for the worker
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Note: This worker usually needs the SERVICE_ROLE_KEY to bypass RLS.
// However, we'll fallback to the ANON key if the service key isn't available,
// assuming the RLS policies allow reading the necessary data (like the frontend does).
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY) must be set in .env.local');
    process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('WARNING: Using Anon Key. Ensure RLS policies allow reading all user data, or provide SUPABASE_SERVICE_ROLE_KEY for full access.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

async function calculateAndSaveStats() {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting stats calculation across 54k+ rows...`);

    try {
        // 1. Fetch ALL Data (paginated)
        // We need to fetch rows in chunks to accumulate stats in memory
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;

        // Cumulative Stats Counters
        let stats = {
            total_users: 0,
            human_users: 0,
            bot_users: 0,
            total_contributions: 0, // Previously called total_messages
            tweet_messages: 0,
            art_messages: 0,
            total_chat_messages: 0, // general + devnet + report
            active_users_7d: 0,
            active_users_30d: 0
        };

        const now = new Date();
        const date7dAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const date30dAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Region Stats Map: region -> { user_count, total_contributions }
        const regionMap = new Map();
        // Role Stats Map: role_name -> count
        const roleMap = new Map();

        // Used for active user count in avg calculation
        let activeUsersForAvg = 0;

        while (hasMore) {
            const { data: batch, error } = await supabase
                .from('seismic_dc_user')
                .select('is_bot, total_messages, tweet, art, general_chat, devnet_chat, report_chat, last_message_date, region, roles')
                .range(offset, offset + batchSize - 1);

            if (error) {
                console.error('Error fetching batch:', error);
                throw error; // Or retry? For now, we abort this cycle.
            }

            if (!batch || batch.length === 0) {
                hasMore = false;
                break;
            }

            // Process Batch
            for (const user of batch) {
                stats.total_users++;

                if (user.is_bot) {
                    stats.bot_users++;
                } else {
                    // Only count as "human user" if they are Verified (per user request)
                    if (user.roles && user.roles.includes('Magnitude 1.0')) {
                        stats.human_users++;
                    }
                }

                // Sum messages
                const tm = user.total_messages || 0;
                stats.total_contributions += tm;
                stats.tweet_messages += (user.tweet || 0);
                stats.art_messages += (user.art || 0);
                stats.total_chat_messages += (user.general_chat || 0) + (user.devnet_chat || 0) + (user.report_chat || 0);

                if (tm > 0) activeUsersForAvg++;

                // Check Activity
                if (user.last_message_date) {
                    const lastActive = new Date(user.last_message_date);
                    if (lastActive >= date7dAgo) stats.active_users_7d++;
                    if (lastActive >= date30dAgo) stats.active_users_30d++;
                }

                // Region Stats (Only count non-bots usually, or all?)
                // Assuming regions are meaningful for users
                if (user.region && !user.is_bot) {
                    const rData = regionMap.get(user.region) || { user_count: 0, total_contributions: 0 };
                    rData.user_count++;
                    rData.total_contributions += tm;
                    regionMap.set(user.region, rData);
                }

                // --- Role Stats Calculation ---
                // Only for non-bots
                if (!user.is_bot && user.roles && Array.isArray(user.roles)) {
                    let highestMagnitude = null;
                    let highestMagnitudeRole = null;
                    const magnitudePattern = /^Magnitude (\d+\.?\d*)$/;

                    // Check for special roles first (accumulate them independently)
                    if (user.roles.includes('Verified')) {
                        roleMap.set('Verified', (roleMap.get('Verified') || 0) + 1);
                    }
                    if (user.roles.includes('Leader')) {
                        roleMap.set('Leader', (roleMap.get('Leader') || 0) + 1);
                    }

                    // Find highest magnitude
                    for (const role of user.roles) {
                        const match = role.match(magnitudePattern);
                        if (match) {
                            const magValue = parseFloat(match[1]);
                            if (highestMagnitude === null || magValue > highestMagnitude) {
                                highestMagnitude = magValue;
                                highestMagnitudeRole = role;
                            }
                        }
                    }

                    // Count specific Magnitude role (only the highest one per user)
                    if (highestMagnitudeRole) {
                        roleMap.set(highestMagnitudeRole, (roleMap.get(highestMagnitudeRole) || 0) + 1);
                    }
                }

            } // End of batch loop

            offset += batchSize;
            if (batch.length < batchSize) hasMore = false;

            // Log progress occasionally
            if (offset % 10000 === 0) {
                console.log(`Processed ${offset} rows...`);
            }
        } // End of while loop

        // Final Calculations
        const avgMessagesPerActiveUser = activeUsersForAvg > 0 ? (stats.total_contributions / activeUsersForAvg) : 0;

        // Convert Map to Array for JSONB storage
        const regionStatsArray = Array.from(regionMap.entries())
            .map(([region, data]) => ({ region, user_count: data.user_count, total_contributions: data.total_contributions }))
            .sort((a, b) => b.user_count - a.user_count);

        // 2. Prepare Snapshot Payload
        const snapshotData = {
            total_users: stats.total_users,
            human_users: stats.human_users,
            bot_users: stats.bot_users,
            total_contributions: stats.total_contributions, // Renamed column
            tweet_messages: stats.tweet_messages,
            art_messages: stats.art_messages,
            total_chat_messages: stats.total_chat_messages,
            active_users_7d: stats.active_users_7d,
            active_users_30d: stats.active_users_30d,
            avg_messages_per_active_user: avgMessagesPerActiveUser,
            region_stats: regionStatsArray, // Stored as JSONB
            created_at: new Date().toISOString()
        };

        // 3. Update Existing or Insert New
        const { data: latestSnapshot } = await supabase
            .from('seismic_stats_snapshot')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        let error;
        if (latestSnapshot) {
            console.log(`Updating existing snapshot ID: ${latestSnapshot.id}`);
            const { error: updateError } = await supabase
                .from('seismic_stats_snapshot')
                .update(snapshotData)
                .eq('id', latestSnapshot.id);
            error = updateError;
        } else {
            console.log('No existing snapshot found. Creating new one.');
            const { error: insertError } = await supabase
                .from('seismic_stats_snapshot')
                .insert(snapshotData);
            error = insertError;
        }

        if (error) {
            console.error('Error saving snapshot to DB:', error);
        } else {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[${new Date().toISOString()}] Snapshot saved successfully in ${duration}s.`);
            console.log(`Stats Summary: Users=${stats.total_users}, Humans=${stats.human_users}, Contribs=${stats.total_contributions}, Regions=${regionStatsArray.length}`);
        }

    } catch (err) {
        console.error('Critical error in calculation cycle:', err);
    }
}

async function cleanupOldAuthUsers() {
    try {
        // console.log(`[${new Date().toISOString()}] Checking for stale auth users (older than 24h)...`);

        // Fetch up to 1000 users (should be enough for daily active users of this dashboard)
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

        if (error) {
            console.error('Error listing auth users:', error);
            return;
        }

        const now = Date.now();
        const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
        let deletedCount = 0;

        if (users && users.length > 0) {
            for (const user of users) {
                // Check last sign in time
                const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;

                // Delete if older than 24 hours
                if (now - lastSignIn > MAX_AGE_MS) {
                    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
                    if (deleteError) {
                        console.error(`Failed to delete user session ${user.id}:`, deleteError.message);
                    } else {
                        deletedCount++;
                    }
                }
            }
        }

        if (deletedCount > 0) {
            console.log(`[${new Date().toISOString()}] 🔒 Security Sweep: Removed ${deletedCount} old login sessions.`);
        }

    } catch (err) {
        console.error('Error in auth cleanup routine:', err);
    }
}

// Infinite Loop Runner
async function runWorker() {
    console.log("=== Seismic Stats Worker Initialization ===");
    console.log(`Endpoint: ${SUPABASE_URL}`);

    // Run immediately first
    await calculateAndSaveStats();

    // Loop
    while (true) {
        console.log(`Sleeping for ${COOLDOWN_MS / 1000 / 60} minutes before next run...`);
        await new Promise(resolve => setTimeout(resolve, COOLDOWN_MS));
        await calculateAndSaveStats();
        await cleanupOldAuthUsers();
    }
}

runWorker();
