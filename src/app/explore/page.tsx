import RoleExplorer from '@/components/RoleExplorer';

export const metadata = {
    title: 'Explore | Seismic Community Dashboard',
    description: 'Explore community members by role',
};

export default function ExplorePage() {
    return (
        <div className="container page-padding">
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ marginBottom: 8 }}>Explore Community</h1>
                <p className="text-muted">
                    Browse members by role and view their contributions
                </p>
            </div>

            <div>
                {/* Role Explorer */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Browse by Role</h3>
                    </div>
                    <RoleExplorer />
                </div>
            </div>
        </div>
    );
}
