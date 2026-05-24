import { Suspense } from 'react';
import Link from 'next/link';
import { BarChart3, Globe2, Search, ShieldCheck, Trophy } from 'lucide-react';
import UserSearch from '@/components/UserSearch';
import HomeStats from '@/components/HomeStats';
import Leaderboard from '@/components/Leaderboard';
import StatsOverview from '@/components/StatsOverview';
import GlobalCoverage from '@/components/GlobalCoverage';
import { LoaderFive } from '@/components/ui/loader';
import { supabase } from '@/lib/supabase';

export const revalidate = 60;

type DashboardSnapshot = {
  total_contributions?: number;
  human_users?: number;
  active_users_7d?: number;
  active_users_30d?: number;
  region_stats?: string | DashboardRegion[];
  created_at?: string;
};

type DashboardRegion = {
  region: string;
  user_count: number;
  total_contributions: number;
};

function parseRegions(value: DashboardSnapshot['region_stats']): DashboardRegion[] {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is DashboardRegion => {
        return Boolean(
          item &&
          typeof item === 'object' &&
          'region' in item &&
          'user_count' in item &&
          'total_contributions' in item
        );
      })
      .sort((a, b) => b.user_count - a.user_count);
  } catch (error) {
    console.error('Error parsing dashboard region stats', error);
    return [];
  }
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US');
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function DashboardSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="dashboard-section">
      <div className="dashboard-section-header">
        <div>
          <div className="dashboard-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="dashboard-metric">
      <div className="dashboard-metric-label">{label}</div>
      <div className="dashboard-metric-value">{value}</div>
      <div className="dashboard-metric-note">{note}</div>
    </div>
  );
}

function QuickJump({
  href,
  label,
  detail,
  icon,
}: {
  href: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="dashboard-jump">
      <span className="dashboard-jump-icon">{icon}</span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span aria-hidden="true">-&gt;</span>
    </Link>
  );
}

export default async function HomePage() {
  const { data: snapshotRaw } = await supabase
    .from('seismic_stats_snapshot')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const snapshot = snapshotRaw as DashboardSnapshot | null;
  const totalContributions = snapshot?.total_contributions || 0;
  const totalMembers = snapshot?.human_users || 0;
  const active30d = snapshot?.active_users_30d || 0;
  const active7d = snapshot?.active_users_7d || 0;
  const regionStats = parseRegions(snapshot?.region_stats);
  const totalRegions = regionStats.length;
  const updatedAt = snapshot?.created_at
    ? new Date(snapshot.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : 'live';

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="dashboard-shell-label">
            <ShieldCheck size={16} strokeWidth={1.8} />
            <span>Privacy enabled community index</span>
          </div>
          <h1>A privacy-first view of the Seismic community.</h1>
          <p>
            Explore Discord profiles, badge-ranked leaderboards, activity statistics,
            and global coverage through a calm financial dashboard built for repeat use.
          </p>
          <div className="dashboard-hero-actions">
            <Link href="#search" className="btn btn-primary">
              Search profile
            </Link>
            <Link href="#leaderboard" className="btn btn-secondary">
              View leaderboard
            </Link>
          </div>
        </div>

        <div className="dashboard-account-panel" aria-label="community account summary">
          <div className="account-panel-top">
            <span>Seismic Community</span>
            <span>Updated {updatedAt}</span>
          </div>
          <div className="account-balance">
            <span>Total Contributions</span>
            <strong>{formatNumber(totalContributions)}</strong>
          </div>
          <div className="account-detail-grid">
            <div>
              <span>Members</span>
              <strong>{formatNumber(totalMembers)}</strong>
            </div>
            <div>
              <span>Active 30d</span>
              <strong>{formatNumber(active30d)}</strong>
            </div>
            <div>
              <span>Regions</span>
              <strong>{formatNumber(totalRegions)}</strong>
            </div>
            <div>
              <span>Profile IDs</span>
              <strong>**** **** ****</strong>
            </div>
          </div>
          <div className="account-flow-row">
            <span>Discord activity</span>
            <span>Private index</span>
            <span>Shielded NFT</span>
          </div>
        </div>
      </section>

      <HomeStats />

      <div className="dashboard-metrics-grid">
        <MetricCard label="Contributions" value={formatCompact(totalContributions)} note="tweet + art activity" />
        <MetricCard label="Members" value={formatCompact(totalMembers)} note="non-bot community users" />
        <MetricCard label="Active 30d" value={formatCompact(active30d)} note={`${formatNumber(active7d)} active in 7d`} />
        <MetricCard label="Regions" value={formatNumber(totalRegions)} note="self-reported coverage" />
      </div>

      <div className="dashboard-jump-grid" aria-label="dashboard navigation">
        <QuickJump href="#search" label="Search" detail="connect Discord and inspect your profile" icon={<Search size={16} />} />
        <QuickJump href="#leaderboard" label="Leaderboard" detail="badge-ranked contributor table" icon={<Trophy size={16} />} />
        <QuickJump href="#statistics" label="Statistics" detail="community metrics and distributions" icon={<BarChart3 size={16} />} />
        <QuickJump href="#global" label="Global" detail="regional coverage snapshot" icon={<Globe2 size={16} />} />
      </div>

      <DashboardSection
        id="search"
        eyebrow="01 Search"
        title="Profile Lookup"
        description="Connect Discord to load your profile card, rank, role, and export flow without changing the existing auth path."
      >
        <div className="dashboard-panel dashboard-panel-narrow">
          <UserSearch />
        </div>
      </DashboardSection>

      <DashboardSection
        id="leaderboard"
        eyebrow="02 Leaderboard"
        title="Badge Leaderboard"
        description="Badge-ranked community contributors with search, pagination, and profile detail modals."
      >
        <Suspense fallback={<div className="dashboard-loading"><LoaderFive text="Loading Leaderboard..." /></div>}>
          <Leaderboard />
        </Suspense>
      </DashboardSection>

      <DashboardSection
        id="statistics"
        eyebrow="03 Statistics"
        title="Community Statistics"
        description="A live snapshot of activity, top contributors, contribution mix, and regional distribution."
      >
        <StatsOverview />
      </DashboardSection>

      <DashboardSection
        id="global"
        eyebrow="04 Global"
        title="Global Coverage"
        description="Regional coverage and sampled network activity rendered directly in the index."
      >
        <GlobalCoverage />
      </DashboardSection>
    </div>
  );
}
