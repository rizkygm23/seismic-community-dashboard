'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RoleDistribution, LeaderboardUser } from '@/types/database';
import { getHighestRoleIcon, getRoleIconPath } from '@/lib/roleUtils';
import UserDetailModal from './UserDetailModal';
import { LoaderFive } from "@/components/ui/loader";

export default function RoleExplorer() {
    const [roles, setRoles] = useState<RoleDistribution[]>([]);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [roleMembers, setRoleMembers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [membersLoading, setMembersLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
    const [roleCache, setRoleCache] = useState<Record<string, LeaderboardUser[]>>({});

    const fetchMembersForRole = useCallback(async (roleName: string) => {
        const magnitudePattern = /^Magnitude (\d+\.?\d*)$/;
        const isMagnitudeRole = magnitudePattern.test(roleName);
        const selectedMagValue = isMagnitudeRole ? parseFloat(roleName.match(magnitudePattern)![1]) : 0;

        let foundMembers: LeaderboardUser[] = [];
        let offset = 0;
        const batchSize = 1000;
        const hardLimit = 15000;

        while (foundMembers.length < 20) {
            const { data, error } = await supabase
                .from('seismic_dc_user')
                .select('id, username, display_name, avatar_url, roles, tweet, art, total_messages')
                .eq('is_bot', false)
                .contains('roles', [roleName])
                .order('total_messages', { ascending: false })
                .range(offset, offset + batchSize - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;

            let validBatch = data || [];

            if (isMagnitudeRole) {
                validBatch = validBatch.filter((user: any) => {
                    const userRoles = user.roles || [];
                    let highestMag = 0;
                    userRoles.forEach((role: string) => {
                        const match = role.match(magnitudePattern);
                        if (match) {
                            const magValue = parseFloat(match[1]);
                            if (magValue > highestMag) highestMag = magValue;
                        }
                    });
                    return highestMag === selectedMagValue;
                });
            }

            foundMembers = [...foundMembers, ...validBatch];

            if (foundMembers.length >= 20) break;
            if (data.length < batchSize) break;

            offset += batchSize;
            if (offset >= hardLimit) break;
        }

        return foundMembers.slice(0, 20);
    }, []);

    useEffect(() => {
        async function fetchRoles() {
            setLoading(true);
            try {
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

                const sortedRoles = Array.from(roleMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([role_name, user_count]) => ({ role_name, user_count }));

                setRoles(sortedRoles);
            } catch (error) {
                console.error('Role fetch error:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRoles();
    }, []);

    useEffect(() => {
        if (roles.length === 0) return;

        let isMounted = true;
        const prefetch = async () => {
            const sortedRoles = [...roles].sort((a, b) => {
                if (a.role_name === 'Verified') return -1;
                if (b.role_name === 'Verified') return 1;
                return b.user_count - a.user_count;
            });

            for (const role of sortedRoles) {
                if (!isMounted) break;

                let isCached = false;
                setRoleCache(prev => {
                    if (prev[role.role_name]) isCached = true;
                    return prev;
                });
                if (isCached) continue;

                try {
                    await new Promise(r => setTimeout(r, 600));
                    if (!isMounted) break;

                    const members = await fetchMembersForRole(role.role_name);

                    if (!isMounted) break;
                    setRoleCache(prev => {
                        if (prev[role.role_name]) return prev;
                        return { ...prev, [role.role_name]: members };
                    });
                } catch (e) { }
            }
        };

        prefetch();
        return () => { isMounted = false; };
    }, [roles, fetchMembersForRole]);

    const handleRoleSelect = useCallback(async (roleName: string) => {
        if (selectedRole === roleName) {
            setSelectedRole(null);
            setRoleMembers([]);
            return;
        }

        setSelectedRole(roleName);

        if (roleCache[roleName]) {
            setRoleMembers(roleCache[roleName]);
            return;
        }

        setMembersLoading(true);
        try {
            const members = await fetchMembersForRole(roleName);
            setRoleMembers(members);
            setRoleCache(prev => ({ ...prev, [roleName]: members }));
        } catch (error) {
            console.error('Role members fetch error:', error);
            setRoleMembers([]);
        } finally {
            setMembersLoading(false);
        }
    }, [selectedRole, roleCache, fetchMembersForRole]);

    if (loading) {
        return (
            <div className="flex justify-center" style={{ padding: 40 }}>
                <LoaderFive text="Loading Roles..." />
            </div>
        );
    }

    return (
        <div>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: selectedRole ? 24 : 0,
            }}>
                {roles.map((role) => {
                    const iconPath = getRoleIconPath(role.role_name);

                    return (
                        <button
                            key={role.role_name}
                            onClick={() => handleRoleSelect(role.role_name)}
                            className={`badge ${selectedRole === role.role_name ? 'badge-primary' : ''}`}
                            style={{
                                cursor: 'pointer',
                                border: 'none',
                                fontSize: '0.8125rem',
                                padding: '6px 12px',
                                transition: 'all var(--transition-fast)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            {iconPath && (
                                <img
                                    src={iconPath}
                                    alt=""
                                    style={{ width: 16, height: 16, objectFit: 'contain' }}
                                />
                            )}
                            {role.role_name}
                            <span style={{
                                opacity: 0.7,
                                fontSize: '0.75rem',
                            }}>
                                {role.user_count.toLocaleString()}
                            </span>
                        </button>
                    );
                })}
            </div>

            {selectedRole && (
                <div className="card fade-in" style={{ marginTop: 16 }}>
                    <div className="card-header">
                        <h3 className="card-title">
                            Members with "{selectedRole}"
                        </h3>
                        <span className="badge">{roleMembers.length} shown</span>
                    </div>

                    {membersLoading ? (
                        <div className="flex justify-center" style={{ padding: 24 }}>
                            <LoaderFive text="Loading Members..." />
                        </div>
                    ) : roleMembers.length > 0 ? (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {roleMembers.map((user) => {
                                const roleIcon = getHighestRoleIcon(user.roles);
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: 12,
                                            background: 'var(--seismic-gray-800)',
                                            borderRadius: 'var(--border-radius-sm)',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        className="hover:bg-gray-700"
                                    >
                                        <div className="avatar avatar-sm">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.username} />
                                            ) : (
                                                user.username[0].toUpperCase()
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="font-medium truncate" style={{
                                                color: 'var(--seismic-white)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6
                                            }}>
                                                {user.display_name || user.username}
                                                {roleIcon && (
                                                    <img
                                                        src={roleIcon}
                                                        alt=""
                                                        title="Highest Role"
                                                        style={{ width: 14, height: 14, objectFit: 'contain' }}
                                                    />
                                                )}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                                @{user.username}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, textAlign: 'right' }}>
                                            <div>
                                                <div className="font-medium text-secondary">{user.tweet}</div>
                                                <div className="text-muted" style={{ fontSize: '0.6875rem' }}>Tweet</div>
                                            </div>
                                            <div>
                                                <div className="font-medium text-accent">{user.art}</div>
                                                <div className="text-muted" style={{ fontSize: '0.6875rem' }}>Art</div>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-primary">{user.total_messages}</div>
                                                <div className="text-muted" style={{ fontSize: '0.6875rem' }}>Total</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: 24 }}>
                            <p>No members found with this role</p>
                        </div>
                    )}
                </div>
            )}

            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
}
