'use client';

import { useState } from 'react';
import { SeismicUser } from '@/types/database';
import UserCard from '@/components/UserCard';

export default function UserProfileClient({ user }: { user: SeismicUser }) {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        const url = `${window.location.origin}/user/${user.username}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleShareX = () => {
        const url = `${window.location.origin}/user/${user.username}`;
        const text = `Check out ${user.display_name || user.username}'s profile on the Seismic Community Dashboard! ${user.total_messages.toLocaleString()} contributions 🚀`;
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            '_blank',
            'noopener,noreferrer'
        );
    };

    return (
        <div className="container page-padding">
            {/* Action Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 8,
            }}>
                <a href="/" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--seismic-gray-400)',
                    fontSize: '0.8125rem',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Search
                </a>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        className="btn btn-secondary"
                        onClick={handleCopyLink}
                        style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleShareX}
                        style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Share on X
                    </button>
                </div>
            </div>

            {/* User Card */}
            <UserCard user={user} showDownload={false} showProfileLink={false} />
        </div>
    );
}
