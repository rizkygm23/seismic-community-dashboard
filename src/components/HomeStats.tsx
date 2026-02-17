'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Animated community stats counter displayed on the homepage.
 * Shows live total contributors, contributions, and regions count.
 */
export default function HomeStats() {
    const [stats, setStats] = useState<{
        contributors: number;
        regions: number;
    } | null>(null);

    useEffect(() => {
        async function fetchQuickStats() {
            try {
                const { data: rawSnapshot, error } = await supabase
                    .from('seismic_stats_snapshot')
                    .select('human_users, region_stats')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error) throw error;

                // Cast to any to handle type inference issues
                const snapshot = rawSnapshot as any;

                if (snapshot) {
                    let uniqueRegions = 0;
                    if (snapshot.region_stats) {
                        try {
                            const regions = typeof snapshot.region_stats === 'string'
                                ? JSON.parse(snapshot.region_stats)
                                : snapshot.region_stats;
                            uniqueRegions = Array.isArray(regions) ? regions.length : 0;
                        } catch (e) {
                            console.error("Error parsing region stats", e);
                        }
                    }

                    setStats({
                        contributors: snapshot.human_users || 0,
                        regions: uniqueRegions,
                    });
                }
            } catch (err) {
                console.error('Quick stats error:', err);
            }
        }

        fetchQuickStats();
    }, []);

    if (!stats) return null;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 40,
            flexWrap: 'wrap',
        }}>
            <StatPill label="Contributors" value={stats.contributors.toLocaleString()} />
            <StatPill label="Regions" value={stats.regions.toString()} />
        </div>
    );
}

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 20px',
            background: 'var(--seismic-gray-900)',
            border: '1px solid var(--seismic-gray-800)',
            borderRadius: 40,
        }}>
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '1.125rem',
                color: color || 'var(--seismic-white)',
                letterSpacing: '-0.03em',
            }}>
                {value}
            </span>
            <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
                {label}
            </span>
        </div>
    );
}
