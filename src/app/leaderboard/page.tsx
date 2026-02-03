import { Suspense } from 'react';
import LeaderboardContent from './LeaderboardContent';

export const metadata = {
    title: 'Leaderboard | Seismic Community Dashboard',
    description: 'View top contributors in the Seismic Discord community by tweets, art, and overall activity',
};

export default function LeaderboardPage() {
    return (
        <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ marginBottom: 8 }}>Leaderboard</h1>
                <p className="text-muted">
                    Top community contributors ranked by their activity
                </p>
            </div>

            <Suspense fallback={
                <div className="flex justify-center" style={{ padding: 60 }}>
                    <div className="spinner" />
                </div>
            }>
                <LeaderboardContent />
            </Suspense>
        </div>
    );
}
