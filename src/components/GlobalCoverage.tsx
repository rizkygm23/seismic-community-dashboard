'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { LoaderFive } from '@/components/ui/loader';
import { GlobeConfig } from '@/components/ui/globe';

const World = dynamic(() => import('@/components/ui/globe').then((m) => m.World), {
  ssr: false,
});

const REGION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Indonesian: { lat: -0.7893, lng: 113.9213 },
  American: { lat: 37.0902, lng: -95.7129 },
  Indian: { lat: 20.5937, lng: 78.9629 },
  British: { lat: 55.3781, lng: -3.436 },
  German: { lat: 51.1657, lng: 10.4515 },
  Japanese: { lat: 36.2048, lng: 138.2529 },
  Brazilian: { lat: -14.235, lng: -51.9253 },
  Russian: { lat: 61.524, lng: 105.3188 },
  Chinese: { lat: 35.8617, lng: 104.1954 },
  Canadian: { lat: 56.1304, lng: -106.3468 },
  Australian: { lat: -25.2744, lng: 133.7751 },
  French: { lat: 46.2276, lng: 2.2137 },
  Vietnamese: { lat: 14.0583, lng: 108.2772 },
  Nigerian: { lat: 9.082, lng: 8.6753 },
  Ukrainian: { lat: 48.3794, lng: 31.1656 },
  Pakistani: { lat: 30.3753, lng: 69.3451 },
  Turkish: { lat: 38.9637, lng: 35.2433 },
  Bangladeshi: { lat: 23.685, lng: 90.3563 },
  Iranian: { lat: 32.4279, lng: 53.688 },
  Thai: { lat: 15.87, lng: 100.9925 },
  Korean: { lat: 35.9078, lng: 127.7669 },
  Egyptian: { lat: 26.8206, lng: 30.8025 },
  Moroccan: { lat: 31.7917, lng: -7.0926 },
  Filipino: { lat: 12.8797, lng: 121.774 },
  Spanish: { lat: 40.4637, lng: -3.7492 },
  Italian: { lat: 41.8719, lng: 12.5674 },
  Mexican: { lat: 23.6345, lng: -102.5528 },
  Polish: { lat: 51.9194, lng: 19.1451 },
  Dutch: { lat: 52.1326, lng: 5.2913 },
  Belgian: { lat: 50.5039, lng: 4.4699 },
  Swedish: { lat: 60.1282, lng: 18.6435 },
  Norwegian: { lat: 60.472, lng: 8.4689 },
  Danish: { lat: 56.2639, lng: 9.5018 },
  Finnish: { lat: 61.9241, lng: 25.7482 },
  Greek: { lat: 39.0742, lng: 21.8243 },
  Portuguese: { lat: 39.3999, lng: -8.2245 },
  Argentinian: { lat: -38.4161, lng: -63.6167 },
  Colombian: { lat: 4.5709, lng: -74.2973 },
  Chilean: { lat: -35.6751, lng: -71.543 },
  Peruvian: { lat: -9.19, lng: -75.0152 },
  Venezuelan: { lat: 6.4238, lng: -66.5897 },
  Malaysian: { lat: 4.2105, lng: 101.9758 },
  Singaporean: { lat: 1.3521, lng: 103.8198 },
  'South African': { lat: -30.5595, lng: 22.9375 },
  Kenyan: { lat: -0.0236, lng: 37.9062 },
  Ghanaian: { lat: 7.9465, lng: -1.0232 },
  'Saudi Arabian': { lat: 23.8859, lng: 45.0792 },
  Emirati: { lat: 23.4241, lng: 53.8478 },
  Israeli: { lat: 31.0461, lng: 34.8516 },
  Czech: { lat: 49.8175, lng: 15.473 },
  Romanian: { lat: 45.9432, lng: 24.9668 },
  Hungarian: { lat: 47.1625, lng: 19.5033 },
  Swiss: { lat: 46.8182, lng: 8.2275 },
  Austrian: { lat: 47.5162, lng: 14.5501 },
  Irish: { lat: 53.1424, lng: -7.6921 },
  'New Zealander': { lat: -40.9006, lng: 174.886 },
  Algerian: { lat: 28.0339, lng: 1.6596 },
  Tunisian: { lat: 33.8869, lng: 9.5375 },
  Nepali: { lat: 28.3949, lng: 84.124 },
  'Sri Lankan': { lat: 7.8731, lng: 80.7718 },
};

const globeConfig: GlobeConfig = {
  pointSize: 4,
  globeColor: '#131014',
  showAtmosphere: true,
  atmosphereColor: '#ffffff',
  atmosphereAltitude: 0.1,
  emissive: '#523542',
  emissiveIntensity: 0.1,
  shininess: 0.9,
  polygonColor: 'rgba(255,255,255,0.72)',
  ambientLight: '#825a6d',
  directionalLeftLight: '#ffffff',
  directionalTopLight: '#ffffff',
  pointLight: '#ffffff',
  arcTime: 1000,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  initialPosition: { lat: 20, lng: 0 },
  autoRotate: true,
  autoRotateSpeed: 0.5,
};

type RegionData = {
  region: string;
  user_count: number;
  total_contributions: number;
};

type GlobeArc = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

export default function GlobalCoverage({ showHeader = false }: { showHeader?: boolean }) {
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globeArcs, setGlobeArcs] = useState<GlobeArc[]>([]);

  useEffect(() => {
    async function fetchRegions() {
      try {
        const batchSize = 1000;
        let offset = 0;
        let hasMore = true;
        const regionMap = new Map<string, { user_count: number; total_contributions: number }>();

        while (hasMore) {
          const { data } = await supabase
            .from('seismic_dc_user')
            .select('region, total_messages')
            .eq('is_bot', false)
            .not('region', 'is', null)
            .range(offset, offset + batchSize - 1);

          if (data && data.length > 0) {
            data.forEach((row: { region: string | null; total_messages: number }) => {
              if (!row.region) return;
              const existing = regionMap.get(row.region) || { user_count: 0, total_contributions: 0 };
              existing.user_count += 1;
              existing.total_contributions += row.total_messages || 0;
              regionMap.set(row.region, existing);
            });

            offset += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        const regions = Array.from(regionMap.entries())
          .map(([region, data]) => ({ region, ...data }))
          .sort((a, b) => b.user_count - a.user_count);

        setRegionData(regions);

        const colors = ['#825a6d', '#523542', '#a4a3a1', '#d4d4d4', '#ffffff'];
        const validRegions = regions.filter((region) => REGION_COORDINATES[region.region]);
        const activeRegions = validRegions.slice(0, 30);
        const arcs: GlobeArc[] = [];

        if (activeRegions.length > 1) {
          activeRegions.forEach((startRegion, index) => {
            let endRegion = activeRegions[Math.floor(Math.random() * activeRegions.length)];
            if (endRegion.region === startRegion.region) {
              const otherRegions = activeRegions.filter((region) => region.region !== startRegion.region);
              if (otherRegions.length > 0) {
                endRegion = otherRegions[Math.floor(Math.random() * otherRegions.length)];
              }
            }

            if (endRegion && endRegion.region !== startRegion.region) {
              arcs.push({
                order: index + 1,
                startLat: REGION_COORDINATES[startRegion.region].lat,
                startLng: REGION_COORDINATES[startRegion.region].lng,
                endLat: REGION_COORDINATES[endRegion.region].lat,
                endLng: REGION_COORDINATES[endRegion.region].lng,
                arcAlt: 0.1 + Math.random() * 0.3,
                color: colors[Math.floor(Math.random() * colors.length)],
              });
            }
          });
        }

        setGlobeArcs(arcs);
      } catch (err) {
        console.error('Error fetching regions:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRegions();
  }, []);

  const totalUsers = regionData.reduce((sum, region) => sum + region.user_count, 0);
  const totalContributions = regionData.reduce((sum, region) => sum + region.total_contributions, 0);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <LoaderFive text="Loading Global Data..." />
      </div>
    );
  }

  return (
    <div className="global-coverage">
      {showHeader && (
        <div className="global-coverage-header">
          <h1>Global Community</h1>
          <p className="text-muted">Worldwide distribution of Seismic community members.</p>
        </div>
      )}

      <div className="global-coverage-stats">
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div className="stat-value">{regionData.length.toLocaleString()}</div>
          <div className="stat-label">Regions</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div className="stat-value">{totalUsers.toLocaleString()}</div>
          <div className="stat-label">Community Members</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div className="stat-value">{totalContributions.toLocaleString()}</div>
          <div className="stat-label">Total Contributions</div>
        </div>
      </div>

      <div className="global-coverage-globe">
        <World data={globeArcs} globeConfig={globeConfig} />
        <div className="global-coverage-legend">
          <div>Live Activity (sampled)</div>
          <small>{globeArcs.length.toLocaleString()} connections rendered</small>
        </div>
      </div>

      <div className="card global-coverage-regions">
        <div className="card-header">
          <h3 className="card-title">Top Regions</h3>
          <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
            {regionData.length.toLocaleString()} mapped
          </span>
        </div>
        <div className="global-coverage-region-grid">
          {regionData.slice(0, 10).map((region, index) => (
            <div key={region.region} className="global-coverage-region-row">
              <span className={`rank-badge ${index < 3 ? `rank-${index + 1}` : 'rank-default'}`}>
                {index + 1}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="global-coverage-region-name">{region.region}</div>
                <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                  {region.user_count.toLocaleString()} members / {region.total_contributions.toLocaleString()} contributions
                </div>
              </div>
              <div className="global-coverage-region-share">
                {totalUsers > 0 ? ((region.user_count / totalUsers) * 100).toFixed(1) : 0}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
