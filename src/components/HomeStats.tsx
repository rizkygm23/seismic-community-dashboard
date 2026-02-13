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
                const [humanCount, regionCount] = await Promise.all([
                    supabase.from('seismic_dc_user')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_bot', false),
                    supabase.from('seismic_dc_user')
                        .select('region')
                        .eq('is_bot', false)
                        .not('region', 'is', null),
                ]);

                // Count unique regions
                const uniqueRegions = new Set((regionCount.data || []).map((r: any) => r.region)).size;

                setStats({
                    contributors: humanCount.count || 0,
                    regions: uniqueRegions,
                });
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
