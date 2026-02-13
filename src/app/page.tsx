import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import UserSearch from '@/components/UserSearch';
import HomeStats from '@/components/HomeStats';
import { HomeBentoGrid, HomeBentoData } from '@/components/HomeBentoGrid';
import { supabase } from '@/lib/supabase';

// Revalidate data every 60 seconds (ISR) to keep homepage fresh but performant
export const revalidate = 60;

export default async function HomePage() {
  // Fetch data in parallel
  const [leaderboardRes, statsRes, globalRes, promoRes, exploreRes] = await Promise.all([
    // Leaderboard: Top 10 by total_messages (Art + Tweet)
    supabase.from('seismic_dc_user').select('username, avatar_url, total_messages').order('total_messages', { ascending: false }).limit(10),

    // Stats: RPC
    supabase.rpc('get_community_stats'),

    // Global: Fetch specific regions
    supabase.from('seismic_dc_user').select('region').not('region', 'is', null).limit(2000),

    // Promotion: Top 3 promoted users
    supabase.from('seismic_dc_user').select('username, avatar_url, role_jumat').eq('is_promoted', true).order('role_jumat', { ascending: false }).limit(3),

    // Explore: Count of users with roles (Magnitude 1-9, assuming role_jumat > 0)
    supabase.from('seismic_dc_user').select('*', { count: 'exact', head: true }).gt('role_jumat', 0)
  ]);

  // --- Process Leaderboard ---
  const leaderboard = ((leaderboardRes.data as any[]) || []).map(u => ({
    username: u.username,
    avatar_url: u.avatar_url,
    score: u.total_messages
  }));

  // --- Process Stats ---
  let totalContributions = 0;

  if ((statsRes as any).data && ((statsRes as any).data as any).total_messages > 0) {
    totalContributions = ((statsRes as any).data as any).total_messages;
  } else {
    // Fallback: Sum total_messages from top 1000 users if RPC fails
    const { data: fallbackData } = await supabase
      .from('seismic_dc_user')
      .select('total_messages')
      .order('total_messages', { ascending: false })
      .limit(1000);

    if (fallbackData) {
      totalContributions = fallbackData.reduce((sum, row: any) => sum + (row.total_messages || 0), 0);
    }
  }

  const stats = {
    totalContributions,
  };

  // --- Process Global ---
  const regionCounts: Record<string, number> = {};
  ((globalRes.data as any[]) || []).forEach((row: any) => {
    if (row.region) {
      regionCounts[row.region] = (regionCounts[row.region] || 0) + 1;
    }
  });
  const globalData = {
    totalRegions: Object.keys(regionCounts).length,
  };

  // --- Process Explore ---
  const explore = {
    roleHolderCount: exploreRes.count || 0,
  };

  // --- Process Promotion ---
  const promotedUsers = ((promoRes.data as any[]) || []).map((u: any) => ({
    username: u.username,
    avatar_url: u.avatar_url,
    roleMagnitude: u.role_jumat
  }));

  const promotion = {
    hasPromotion: promotedUsers.length > 0,
    users: promotedUsers
  };

  const bentoData: HomeBentoData | any = {
    leaderboard,
    stats,
    global: globalData,
    explore,
    promotion
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
          Look up your Discord or X username to see your contributions, rankings, and achievements in the Seismic community
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
        <HomeBentoGrid data={bentoData} />
      </div>
    </div>
  );
}
