import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RoleDistribution } from '@/types/database';

/**
 * Fetches and processes role distribution data.
 * Extracts the highest magnitude per user (avoids double-counting),
 * and includes Verified/Leader counts from direct DB queries.
 * 
 * Previously duplicated in StatsOverview.tsx and RoleExplorer.tsx
 */
export function useRoleDistribution() {
    const [roleStats, setRoleStats] = useState<RoleDistribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchRoles() {
            setLoading(true);
            setError(null);

            try {
                const [verifiedCount, leaderCount] = await Promise.all([
                    supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .contains('roles', ['Verified']),
                    supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false)
                        .contains('roles', ['Leader']),
                ]);

                const allRolesData: { roles: string[] | null }[] = [];
                const batchSize = 1000;
                let offset = 0;
                let hasMore = true;

                while (hasMore) {
                    const { data: batch } = await supabase
                        .from('seismic_dc_user')
                        .select('roles')
                        .eq('is_bot', false)
                        .not('roles', 'is', null)
                        .range(offset, offset + batchSize - 1);

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

                if (verifiedCount.count && verifiedCount.count > 0) {
                    roleMap.set('Verified', verifiedCount.count);
                }
                if (leaderCount.count && leaderCount.count > 0) {
                    roleMap.set('Leader', leaderCount.count);
                }

                const sortedRoles = Array.from(roleMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([role_name, user_count]) => ({ role_name, user_count }));

                if (!cancelled) {
                    setRoleStats(sortedRoles);
                }
            } catch (err) {
                console.error('Role distribution fetch error:', err);
                if (!cancelled) {
                    setError('Failed to load role distribution');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchRoles();
        return () => { cancelled = true; };
    }, []);

    return { roleStats, loading, error };
}
