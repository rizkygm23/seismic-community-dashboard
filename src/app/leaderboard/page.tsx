import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Leaderboard | Seismic Community Dashboard',
    description: 'Leaderboard is available in the unified dashboard index.',
};

export default function LeaderboardPage() {
    redirect('/#leaderboard');
}
