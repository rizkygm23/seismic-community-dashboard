import CompareUsers from '@/components/CompareUsers';

export const metadata = {
    title: 'Compare Users | Seismic Community Dashboard',
    description: 'Compare two community members side by side to see their contribution stats',
};

export default function ComparePage() {
    return (
        <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ marginBottom: 8 }}>Compare Users</h1>
                <p className="text-muted">
                    Compare two community members side by side
                </p>
            </div>

            <CompareUsers />
        </div>
    );
}
