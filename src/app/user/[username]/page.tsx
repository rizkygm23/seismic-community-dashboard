import { supabase } from '@/lib/supabase';
import UserProfileClient from './UserProfileClient';
import type { Metadata } from 'next';

interface PageProps {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { username } = await params;
    const { data } = await supabase
        .from('seismic_dc_user')
        .select('username, display_name, total_messages, tweet, art')
        .eq('username', username)
        .single() as { data: any };

    if (!data) {
        return {
            title: 'User Not Found | Seismic Community Dashboard',
        };
    }

    const displayName = data.display_name || data.username;
    return {
        title: `${displayName} | Seismic Community Dashboard`,
        description: `${displayName} has made ${data.total_messages.toLocaleString()} contributions (${data.tweet} tweets, ${data.art} art) in the Seismic community.`,
        openGraph: {
            title: `${displayName}'s Seismic Profile`,
            description: `${data.total_messages.toLocaleString()} contributions in the Seismic Discord community`,
        },
    };
}

export default async function UserProfilePage({ params }: PageProps) {
    const { username } = await params;
    const { data: user, error } = await supabase
        .from('seismic_dc_user')
        .select('*')
        .eq('username', username)
        .single() as { data: any; error: any };

    if (error || !user) {
        return (
            <div className="container page-padding">
                <div className="empty-state" style={{ padding: '120px 20px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 24, opacity: 0.4 }}>🔍</div>
                    <h2 style={{ marginBottom: 12 }}>User Not Found</h2>
                    <p className="text-muted" style={{ maxWidth: 400, margin: '0 auto', marginBottom: 24 }}>
                        We couldn&apos;t find a user with the username <strong>&quot;{username}&quot;</strong> in the Seismic community.
                    </p>
                    <a href="/" className="btn btn-primary">
                        Search for a user
                    </a>
                </div>
            </div>
        );
    }

    return <UserProfileClient user={user} />;
}
