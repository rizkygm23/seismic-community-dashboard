import { Suspense } from 'react';
import LeaderboardContent from './LeaderboardContent';
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { LoaderFive } from "@/components/ui/loader";

export const metadata = {
    title: 'Leaderboard | Seismic Community Dashboard',
    description: 'View top contributors in the Seismic Discord community by tweets, art, and overall activity',
};

export default function LeaderboardPage() {
    return (
        <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <div style={{ marginBottom: 32 }}>
                <TypewriterEffect
                    words={[{ text: "Leaderboard", className: "text-[var(--seismic-primary)]" }]}
                    className="mb-2 text-left"
                    cursorClassName="bg-[var(--seismic-primary)]"
                />
                <p className="text-muted">
                    Top community contributors ranked by their activity
                </p>
            </div>

            <Suspense fallback={
                <div className="flex justify-center" style={{ padding: 60 }}>
                    <LoaderFive text="Loading Leaderboard..." />
                </div>
            }>
                <LeaderboardContent />
            </Suspense>
        </div>
    );
}
