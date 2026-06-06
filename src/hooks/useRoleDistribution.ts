import { useState, useEffect } from 'react';
import { RoleDistribution } from '@/types/database_manual';
import { communityApi } from '@/lib/communityApi';

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
                const { roles } = await communityApi.getRoles();
                if (!cancelled) {
                    setRoleStats(roles);
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
