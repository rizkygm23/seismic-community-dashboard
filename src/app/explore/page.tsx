import RoleExplorer from '@/components/RoleExplorer';
import RecentActivity from '@/components/RecentActivity';

export const metadata = {
    title: 'Explore | Seismic Community Dashboard',
    description: 'Explore community members by role and view recent activity',
};

export default function ExplorePage() {
    return (
        <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ marginBottom: 8 }}>Explore Community</h1>
                <p className="text-muted">
                    Browse members by role and see the latest community activity
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: 24,
                alignItems: 'start',
            }}>
                {/* Role Explorer */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Browse by Role</h3>
                    </div>
                    <RoleExplorer />
                </div>

                {/* Recent Activity */}
                <RecentActivity />
            </div>
        </div>
    );
}
