'use client';

import { useSearchParams } from 'next/navigation';
import Leaderboard from '@/components/Leaderboard';

export default function LeaderboardContent() {
    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type');

    const initialType = typeParam === 'tweet' || typeParam === 'art'
        ? typeParam
        : 'combined';

    return <Leaderboard initialType={initialType} />;
}
