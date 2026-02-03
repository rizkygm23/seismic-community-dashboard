'use client';

import { useEffect, useRef, useState } from 'react';
import UserCard from './UserCard';
import { SeismicUser } from '@/types/database';
import { supabase } from '@/lib/supabase';

// Helper type to allow partial user data input
type PartialUser = Partial<SeismicUser> & { id: number | string; username: string };

interface UserDetailModalProps {
    user: PartialUser;
    onClose: () => void;
}

export default function UserDetailModal({ user: initialUser, onClose }: UserDetailModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const [fullUser, setFullUser] = useState<SeismicUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Close on Escape key
    useEffect(() => {
        function handleEsc(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Fetch full user data
    useEffect(() => {
        async function fetchUserData() {
            setLoading(true);
            try {
                // If the input user seems to have most fields, use it directly (optional optimization)
                // But generally safer to fetch fresh data to ensure all fields needed by UserCard exist
                const { data, error } = await supabase
                    .from('seismic_dc_user')
                    .select('*')
                    .eq('username', initialUser.username)
                    .single();

                if (error) throw error;
                if (data) {
                    setFullUser(data);
                }
            } catch (error) {
                console.error('Error fetching full user details:', error);
            } finally {
                setLoading(false);
            }
        }

        if (initialUser?.username) {
            fetchUserData();
        }
    }, [initialUser]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
        }}>
            <div ref={modalRef} style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: -40,
                        right: 0,
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        fontSize: 24,
                        cursor: 'pointer',
                        padding: 8
                    }}
                >
                    ✕
                </button>
                <div className="card-animate-enter">
                    {loading ? (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                            <div className="spinner" />
                            <p style={{ marginTop: 16, color: 'var(--seismic-gray-400)' }}>Loading user profile...</p>
                        </div>
                    ) : fullUser ? (
                        <UserCard user={fullUser} />
                    ) : (
                        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                            <p>User not found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
