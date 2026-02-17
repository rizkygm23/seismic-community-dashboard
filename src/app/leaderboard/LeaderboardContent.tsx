'use client';

import { useSearchParams } from 'next/navigation';
import Leaderboard from '@/components/Leaderboard';

export default function LeaderboardContent() {
    // URL params are currently unused by the Badge-focused Leaderboard component
    // const searchParams = useSearchParams();

    return <Leaderboard />;
}
