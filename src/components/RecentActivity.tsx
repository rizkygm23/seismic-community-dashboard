'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SeismicUser } from '@/types/database_manual';

export default function RecentActivity() {
    const [recentUsers, setRecentUsers] = useState<SeismicUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRecentActivity() {
            setLoading(true);
            try {
                // Get users with recent activity, ordered by last message date
                const { data, error } = await supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .eq('is_bot', false)
                    .not('last_message_date', 'is', null)
                    .order('last_message_date', { ascending: false })
                    .limit(20);

                if (error) throw error;
                setRecentUsers(data || []);
            } catch (error) {
                console.error('Recent activity fetch error:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRecentActivity();
    }, []);

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex justify-center" style={{ padding: 40 }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ padding: 20 }}>
                <h3 className="card-title">Recent Activity</h3>
                <span className="badge badge-primary">Live Feed</span>
            </div>

            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {recentUsers.map((user, index) => (
                    <div
                        key={user.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '14px 20px',
                            borderBottom: index < recentUsers.length - 1 ? '1px solid var(--seismic-gray-800)' : 'none',
                        }}
                    >
                        <div className="avatar avatar-sm">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.username} />
                            ) : (
                                user.username[0].toUpperCase()
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="font-medium truncate" style={{ color: 'var(--seismic-white)' }}>
                                {user.display_name || user.username}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                @{user.username}
                            </div>
                        </div>
                        <div className="text-right">
                            <div style={{ fontSize: '0.8125rem', color: 'var(--seismic-primary)' }}>
                                {formatTimeAgo(user.last_message_date!)}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {user.total_messages.toLocaleString()} Contributions
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
