import StatsOverview from '@/components/StatsOverview';
import { TypewriterEffect } from "@/components/ui/typewriter-effect";

export const metadata = {
    title: 'Statistics | Seismic Community Dashboard',
    description: 'Community statistics and insights for the Seismic Discord server',
};

export default function StatsPage() {
    return (
        <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <div style={{ marginBottom: 32 }}>
                <TypewriterEffect
                    words={[
                        { text: "Community", className: "text-[var(--seismic-primary)]" },
                        { text: "Statistics", className: "text-[var(--seismic-primary)]" },
                    ]}
                    className="mb-2 text-left"
                    cursorClassName="bg-[var(--seismic-primary)]"
                />
                <p className="text-muted">
                    Overview of member activity and community metrics
                </p>
            </div>

            <StatsOverview />
        </div>
    );
}
