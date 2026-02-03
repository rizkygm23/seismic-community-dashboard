import StatsOverview from '@/components/StatsOverview';

export const metadata = {
    title: 'Statistics | Seismic Community Dashboard',
    description: 'Community statistics and insights for the Seismic Discord server',
};

export default function StatsPage() {
    return (
        <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ marginBottom: 8 }}>Community Statistics</h1>
                <p className="text-muted">
                    Overview of member activity and community metrics
                </p>
            </div>

            <StatsOverview />
        </div>
    );
}
