import RoleExplorer from '@/components/RoleExplorer';
import { TypewriterEffect } from "@/components/ui/typewriter-effect";

export const metadata = {
    title: 'Explore | Seismic Community Dashboard',
    description: 'Explore community members by role',
};

export default function ExplorePage() {
    return (
        <div className="container page-padding">
            <div style={{ marginBottom: 32 }}>
                <TypewriterEffect
                    words={[
                        { text: "Explore", className: "text-[var(--seismic-primary)]" },
                        { text: "Community", className: "text-[var(--seismic-primary)]" },
                    ]}
                    className="mb-2 text-left"
                    cursorClassName="bg-[var(--seismic-primary)]"
                />
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
