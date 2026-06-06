'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoleDistribution, LeaderboardUser } from '@/types/database_manual';
import { getHighestRoleIcon, getRoleIconPath } from '@/lib/roleUtils';
import UserDetailModal from './UserDetailModal';
import { LoaderFive } from "@/components/ui/loader";
import { communityApi } from '@/lib/communityApi';

export default function RoleExplorer() {
    const [roles, setRoles] = useState<RoleDistribution[]>([]);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [roleMembers, setRoleMembers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [membersLoading, setMembersLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
    const [roleCache, setRoleCache] = useState<Record<string, LeaderboardUser[]>>({});

    const fetchMembersForRole = useCallback(async (roleName: string) => {
        const { members } = await communityApi.getRoleMembers(roleName);
        return members;
    }, []);

    useEffect(() => {
        async function fetchRoles() {
            setLoading(true);
            try {
                const { roles } = await communityApi.getRoles();
                setRoles(roles);
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
                            Members with &quot;{selectedRole}&quot;
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
                                            padding: 12,
                                            background: 'var(--seismic-canvas)',
                                            border: '1px solid var(--seismic-hairline)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s, border-color 0.2s'
                                        }}
                                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                                    >
                                        <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 min-w-0">
                                            <div className="avatar avatar-sm shrink-0">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.username} />
                                                ) : (
                                                    user.username[0].toUpperCase()
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="font-medium truncate" style={{
                                                    color: 'var(--seismic-ink)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }}>
                                                    <span className="truncate">{user.display_name || user.username}</span>
                                                    {roleIcon && (
                                                        <img
                                                            src={roleIcon}
                                                            alt=""
                                                            title="Highest Role"
                                                            style={{ width: 14, height: 14, objectFit: 'contain' }}
                                                            className="shrink-0"
                                                        />
                                                    )}
                                                </div>
                                                <div className="text-muted truncate" style={{ fontSize: '0.8125rem' }}>
                                                    @{user.username}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between sm:justify-end sm:gap-6 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-[var(--seismic-hairline)]">
                                            <div className="text-center sm:text-right flex-1 sm:flex-none">
                                                <div className="font-medium text-secondary">{user.tweet}</div>
                                                <div className="text-muted" style={{ fontSize: '0.6875rem' }}>Tweet</div>
                                            </div>
                                            <div className="text-center sm:text-right flex-1 sm:flex-none">
                                                <div className="font-medium text-accent">{user.art}</div>
                                                <div className="text-muted" style={{ fontSize: '0.6875rem' }}>Art</div>
                                            </div>
                                            <div className="text-center sm:text-right flex-1 sm:flex-none" title="General + Devnet + Report">
                                                <div className="font-medium" style={{ color: 'var(--seismic-plum-deep)' }}>{(user.general_chat + user.devnet_chat + user.report_chat).toLocaleString()}</div>
                                                <div className="text-muted" style={{ fontSize: '0.6875rem' }}>Chat*</div>
                                            </div>
                                            <div className="text-center sm:text-right flex-1 sm:flex-none">
                                                <div className="font-semibold text-primary">{user.total_messages}</div>
                                                <div className="text-muted" style={{ fontSize: '0.6875rem' }}>Contributions</div>
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
