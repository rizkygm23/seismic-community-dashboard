'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SeismicUser } from '@/types/database';
import UserCard from './UserCard';

export default function UserSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SeismicUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<SeismicUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const searchUsers = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            // Clean up query - remove @ prefix if present
            const cleanQuery = searchQuery.startsWith('@') ? searchQuery.slice(1) : searchQuery;

            if (cleanQuery.length < 1) {
                setResults([]);
                setLoading(false);
                return;
            }

            // Search both Discord username and X username in parallel
            const [discordResult, xResult] = await Promise.all([
                supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .ilike('username', `%${cleanQuery}%`)
                    .eq('is_bot', false)
                    .order('total_messages', { ascending: false })
                    .limit(10),
                supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .ilike('x_username', `%${cleanQuery}%`)
                    .eq('is_bot', false)
                    .order('total_messages', { ascending: false })
                    .limit(10),
            ]);

            // Merge and deduplicate results
            const allResults: SeismicUser[] = [...(discordResult.data || [])];
            const existingIds = new Set(allResults.map(u => u.id));

            ((xResult.data || []) as SeismicUser[]).forEach(user => {
                if (!existingIds.has(user.id)) {
                    allResults.push(user);
                }
            });

            // Sort by total_messages descending
            allResults.sort((a, b) => b.total_messages - a.total_messages);

            setResults(allResults.slice(0, 10));
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        setSelectedUser(null);

        // Debounce search
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            searchUsers(value);
        }, 300);
    };

    const handleUserSelect = (user: SeismicUser) => {
        setSelectedUser(user);
        setResults([]);
        setQuery(user.username);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    return (
        <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
            {/* Search Input */}
            <div className="search-box" style={{ marginBottom: 24 }}>
                <svg
                    className="search-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search by Discord or X username..."
                    value={query}
                    onChange={handleInputChange}
                    autoComplete="off"
                />
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center" style={{ padding: 24 }}>
                    <div className="spinner" />
                </div>
            )}

            {/* Search Results Dropdown */}
            {!loading && results.length > 0 && !selectedUser && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {results.map((user, index) => (
                        <button
                            key={user.id}
                            onClick={() => handleUserSelect(user)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '14px 16px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: index < results.length - 1 ? '1px solid var(--seismic-gray-800)' : 'none',
                                cursor: 'pointer',
                                color: 'inherit',
                                textAlign: 'left',
                                transition: 'background var(--transition-fast)',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--seismic-gray-800)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
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
                                <div className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    @{user.username}
                                    {user.x_username && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--seismic-gray-500)' }}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                            @{user.x_username}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold text-primary">{user.total_messages.toLocaleString()}</div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>contributions</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No Results */}
            {!loading && searched && results.length === 0 && query.length >= 2 && !selectedUser && (
                <div className="empty-state">
                    <h3>No users found</h3>
                    <p>Try searching with a different username</p>
                </div>
            )}

            {/* Selected User Profile */}
            {selectedUser && (
                <div className="fade-in">
                    <UserCard user={selectedUser} showDownload={false} />
                </div>
            )}
        </div>
    );
}
