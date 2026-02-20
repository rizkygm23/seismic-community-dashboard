'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SeismicUser } from '@/types/database_manual';
import UserCard from './UserCard';
import { LoaderFive } from "@/components/ui/loader";
import { User } from '@supabase/supabase-js';
import banList from '@/data/ban_list.json';

export default function UserSearch() {
    const [user, setUser] = useState<User | null>(null);
    const [dbUser, setDbUser] = useState<SeismicUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            setLoading(true);

            // Handle hash fragment manually if present (often happens with OAuth redirects)
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                try {
                    // This helps ensure the session is established from the URL fragments
                    const { data, error } = await supabase.auth.getSession();
                    if (data.session) {
                        setUser(data.session.user);
                        await fetchDbUser(data.session.user);
                        // Clean URL
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                } catch (e) {
                    console.error("Error processing auth hash:", e);
                }
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    await fetchDbUser(session.user);
                }
            } catch (err) {
                console.error('Session check error:', err);
            } finally {
                setLoading(false);
            }

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                if (session?.user) {
                    setUser(session.user);
                    await fetchDbUser(session.user);
                } else {
                    setUser(null);
                    setDbUser(null);
                    setLoading(false);
                }
            });

            return () => subscription.unsubscribe();
        };

        checkSession();
    }, []);

    const fetchDbUser = async (authUser: User) => {
        setLoading(true);
        setError(null);
        try {
            // Get Discord ID from identities or metadata
            // 'sub' in user_metadata is often the provider ID for OAuth
            const discordId = authUser.user_metadata.sub ||
                authUser.identities?.find(i => i.provider === 'discord')?.identity_data?.sub;

            if (!discordId) {
                // Fallback to username matching if ID isn't found (unlikely for Discord OAuth)
                const username = authUser.user_metadata.full_name || authUser.user_metadata.name;
                if (username) {
                    const { data, error } = await supabase
                        .from('seismic_dc_user')
                        .select('*')
                        .ilike('username', username)
                        .eq('is_bot', false)
                        .order('total_messages', { ascending: false })
                        .limit(1)
                        .single();

                    if (data) {
                        const isBanned = banList.some((bannedName: string) =>
                            bannedName.toLowerCase() === (data as any).username.toLowerCase() ||
                            bannedName.toLowerCase() === username.toLowerCase()
                        );
                        if (isBanned) {
                            setError("Data not found or you don't have permission to view it.");
                        } else {
                            setDbUser(data);
                        }
                    } else {
                        setError(`Could not find stats for @${username}. You may not have been active recently.`);
                    }
                } else {
                    setError("Could not retrieve Discord account details.");
                }
                setLoading(false);
                return;
            }

            // Query by Discord ID (user_id column)
            // Note: SeismicUser.user_id is the string Discord ID
            const { data, error } = await supabase
                .from('seismic_dc_user')
                .select('*')
                .eq('user_id', discordId)
                .single();

            if (error || !data) {
                // Try fallback to username if ID lookup fails
                const username = authUser.user_metadata.custom_claims?.global_name ||
                    authUser.user_metadata.full_name ||
                    authUser.user_metadata.name;

                if (username) {
                    const { data: nameData } = await supabase
                        .from('seismic_dc_user')
                        .select('*')
                        .ilike('username', username)
                        .eq('is_bot', false)
                        .limit(1)
                        .single();

                    if (nameData) {
                        const isBanned = banList.some((bannedName: string) =>
                            bannedName.toLowerCase() === (nameData as any).username.toLowerCase() ||
                            bannedName.toLowerCase() === username.toLowerCase()
                        );
                        if (isBanned) {
                            setError("Data not found or you don't have permission to view it.");
                        } else {
                            setDbUser(nameData);
                        }
                    } else {
                        setError(`Welcome, ${username}! We couldn't find your stats yet. Data is synced periodically.`);
                    }
                } else {
                    setError("Welcome! We couldn't find your stats in our database yet.");
                }
            } else {
                const authUsername = authUser.user_metadata.custom_claims?.global_name ||
                    authUser.user_metadata.full_name ||
                    authUser.user_metadata.name;

                const isBanned = banList.some((bannedName: string) =>
                    bannedName.toLowerCase() === (data as any).username.toLowerCase() ||
                    (authUsername && bannedName.toLowerCase() === authUsername.toLowerCase())
                );

                if (isBanned) {
                    setError("Data not found or you don't have permission to view it.");
                } else {
                    setDbUser(data);
                }
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
            setError("An unexpected error occurred while loading your stats.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.href, // Redirect back to current page
                    scopes: 'identify', // Basic identity scope
                },
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to initiate login');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setDbUser(null);
        setError(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center" style={{ padding: 40 }}>
                <LoaderFive text="Connecting to Discord..." />
            </div>
        );
    }

    return (
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            {!user ? (
                <div className="card" style={{ padding: '40px', border: '1px dashed var(--seismic-gray-700)' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: '#5865F2',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20.317 4.3698C18.7903 3.6698 17.1543 3.16147 15.4293 3C15.221 3.375 14.9918 3.8698 14.836 4.23957C13.0076 3.96873 11.1851 3.96873 9.3876 4.23957C9.23135 3.8698 9.00218 3.375 8.79385 3C7.06885 3.16147 5.43285 3.6698 3.90618 4.3698C0.822852 9.02604 -0.0208984 13.5677 0.385352 18.0417C2.42702 19.5417 4.40618 20.4531 6.34368 21.0469C6.82285 20.3906 7.25 19.6875 7.61452 18.9479C6.90618 18.6823 6.2291 18.3542 5.58327 17.9688C5.75 17.8438 5.9166 17.7083 6.07285 17.5729C10.0312 19.3958 14.1979 19.3958 18.1145 17.5729C18.2708 17.7083 18.4374 17.8438 18.6041 17.9688C17.9583 18.3542 17.2812 18.6823 16.5729 18.9479C16.9374 19.6875 17.3645 20.3906 17.8437 21.0469C19.7812 20.4531 21.7603 19.5417 23.802 18.0417C24.2812 12.9167 23.0103 8.35937 20.317 4.3698ZM8.02077 15.3333C6.84368 15.3333 5.87493 14.25 5.87493 12.9167C5.87493 11.5833 6.81243 10.5 8.02077 10.5C9.23952 10.5 10.1979 11.5833 10.1666 12.9167C10.1666 14.25 9.2291 15.3333 8.02077 15.3333ZM16.2083 15.3333C15.0312 15.3333 14.0624 14.25 14.0624 12.9167C14.0624 11.5833 15.00 10.5 16.2083 10.5C17.427 10.5 18.3854 11.5833 18.3541 12.9167C18.3541 14.25 17.4166 15.3333 16.2083 15.3333Z" />
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Check Your Stats</h3>
                        <p style={{ color: 'var(--seismic-gray-400)', fontSize: '14px', marginBottom: '24px' }}>
                            Sign in with Discord to view your contribution history and ranking.
                        </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <button
                            onClick={handleLogin}
                            className="btn"
                            style={{
                                width: '100%',
                                maxWidth: '384px',
                                background: '#5865F2',
                                color: 'white',
                                border: 'none',
                                gap: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <span>Connect Discord</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                        </button>
                    </div>
                    {error && <p style={{ color: '#f87171', marginTop: '16px', fontSize: '14px' }}>{error}</p>}
                </div>
            ) : (
                <div className="fade-in" style={{ padding: '0 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#262626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {user.user_metadata.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                        {user.user_metadata.full_name?.[0]?.toUpperCase() || user.user_metadata.name?.[0]?.toUpperCase() || 'U'}
                                    </span>
                                )}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '12px', color: 'var(--seismic-gray-400)' }}>Logged in as</div>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--seismic-white)' }}>
                                    {user.user_metadata.full_name || user.user_metadata.name || 'Community Member'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                fontSize: '12px',
                                color: 'var(--seismic-gray-400)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--seismic-gray-400)'}
                        >
                            Sign Out
                        </button>
                    </div>

                    {dbUser ? (
                        <div className="space-y-6">
                            <UserCard user={dbUser} showDownload={false} />


                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="mb-4 text-4xl">👋</div>
                            <h3>Welcome, {user.user_metadata.full_name?.split(' ')[0] || 'Friend'}!</h3>
                            <p className="mb-6">{error || "We couldn't find your stats in the database yet."}</p>
                            <p className="text-xs text-muted max-w-md mx-auto">
                                Note: It may take some time for new members or recent activity to appear.
                                Make sure you have chatted in the server recently.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
