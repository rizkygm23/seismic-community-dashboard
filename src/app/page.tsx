import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import UserSearch from '@/components/UserSearch';
import HomeStats from '@/components/HomeStats';
import { HomeBentoGrid, HomeBentoData } from '@/components/HomeBentoGrid';
import { supabase } from '@/lib/supabase';

// Revalidate data every 60 seconds (ISR) to keep homepage fresh but performant
export const revalidate = 60;

export default async function HomePage() {
  // Fetch data in parallel
  const [leaderboardRes, snapshotRes] = await Promise.all([
    // Leaderboard: Top 10 by total_messages (Art + Tweet)
    supabase.from('seismic_dc_user')
      .select('username, avatar_url, total_messages')
      .order('total_messages', { ascending: false })
      .limit(10),

    // Stats Snapshot: Single query for all aggregate data
    supabase.from('seismic_stats_snapshot')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  ]) as [any, any];

  // --- Process Leaderboard ---
  const leaderboard = ((leaderboardRes.data as any[]) || []).map(u => ({
    username: u.username,
    avatar_url: u.avatar_url,
    score: u.total_messages
  }));

  // --- Process Stats from Snapshot ---
  let totalContributions = 0;
  let totalRegions = 0;

  if (snapshotRes.data) {
    const snap = snapshotRes.data as any;
    totalContributions = snap.total_contributions || 0;

    // Parse region stats if needed
    if (snap.region_stats) {
      try {
        const regions = typeof snap.region_stats === 'string'
          ? JSON.parse(snap.region_stats)
          : snap.region_stats;
        totalRegions = Array.isArray(regions) ? regions.length : 0;
      } catch (e) {
        console.error("Error parsing region stats in home page", e);
      }
    }
  }

  const stats = {
    totalContributions,
  };

  const globalData = {
    totalRegions,
  };

  const bentoData: HomeBentoData | any = {
    leaderboard,
    stats,
    global: globalData
  };

  return (
    <div className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
      {/* Hero Section */}
      <div className="text-center" style={{ marginBottom: 48, position: 'relative' }}>
        {/* Subtle glow behind hero */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(var(--seismic-primary-rgb), 0.12) 0%, rgba(0,0,0,0) 70%)',
          zIndex: -1,
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }} />

        <TypewriterEffect
          words={[
            { text: "Seismic", className: "text-[var(--seismic-primary)]" },
            { text: "Community", className: "text-[var(--seismic-primary)]" },
            { text: "Dashboard", className: "text-[var(--seismic-primary)]" }
          ]}
          className="mb-4"
          cursorClassName="bg-[var(--seismic-primary)]"
        />

        <p className="text-muted" style={{ fontSize: '1.125rem', maxWidth: 520, margin: '0 auto' }}>
          Connect your Discord account to see your personal contributions, rankings, and achievements
        </p>
      </div>

      {/* Live Community Counter */}
      <HomeStats />

      {/* Search Component */}
      <div style={{ marginTop: 40 }}>
        <UserSearch />
      </div>

      {/* Bento Grid Navigation */}
      <div style={{ marginTop: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '32px', padding: '0 16px' }}>
          <p style={{
            fontSize: '14px',
            color: 'rgb(163, 163, 163)',
            fontStyle: 'italic',
            textAlign: 'center',
            maxWidth: '600px',
            margin: 0
          }}>
            "These rankings are prepared based on numbers, but in Seismic, sometimes one high-level contribution can be more valuable than ten regular contributions"
          </p>
        </div>
        <HomeBentoGrid data={bentoData} />
      </div>
    </div>
  );
}
