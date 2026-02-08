'use client';

import { useState, useEffect, memo } from 'react';
import { supabase } from '@/lib/supabase';
import {
    ComposableMap,
    Geographies,
    Geography,
    ZoomableGroup,
} from 'react-simple-maps';
import TerminalLoader from '@/components/TerminalLoader';

// World map topojson URL
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Map region names to numeric country IDs (used by world-atlas)
// These IDs correspond to ISO 3166-1 numeric codes
const regionToCountryId: Record<string, string> = {
    'Indonesian': '360',
    'Nigerian': '566',
    'Indian': '356',
    'Vietnamese': '704',
    'Russian': '643',
    'Ukrainian': '804',
    'Pakistani': '586',
    'Turkish': '792',
    'Bangladeshi': '050',
    'Iranian': '364',
    'French': '250',
    'Thai': '764',
    'Korean': '410',
    'Egyptian': '818',
    'Moroccan': '504',
    'Brazilian': '076',
    'Filipino': '608',
    'Japanese': '392',
    'Chinese': '156',
    'American': '840',
    'British': '826',
    'German': '276',
    'Spanish': '724',
    'Italian': '380',
    'Canadian': '124',
    'Australian': '036',
    'Mexican': '484',
    'Polish': '616',
    'Dutch': '528',
    'Belgian': '056',
    'Swedish': '752',
    'Norwegian': '578',
    'Danish': '208',
    'Finnish': '246',
    'Greek': '300',
    'Portuguese': '620',
    'Argentinian': '032',
    'Colombian': '170',
    'Chilean': '152',
    'Peruvian': '604',
    'Venezuelan': '862',
    'Malaysian': '458',
    'Singaporean': '702',
    'South African': '710',
    'Kenyan': '404',
    'Ghanaian': '288',
    'Saudi Arabian': '682',
    'Emirati': '784',
    'Israeli': '376',
    'Czech': '203',
    'Romanian': '642',
    'Hungarian': '348',
    'Swiss': '756',
    'Austrian': '040',
    'Irish': '372',
    'New Zealander': '554',
    'Algerian': '012',
    'Tunisian': '788',
    'Nepali': '524',
    'Sri Lankan': '144',
};


// Country ID to name (for tooltips) - uses numeric IDs
const countryIdToName: Record<string, string> = {
    '360': 'Indonesia',
    '566': 'Nigeria',
    '356': 'India',
    '704': 'Vietnam',
    '643': 'Russia',
    '804': 'Ukraine',
    '586': 'Pakistan',
    '792': 'Turkey',
    '050': 'Bangladesh',
    '364': 'Iran',
    '250': 'France',
    '764': 'Thailand',
    '410': 'South Korea',
    '818': 'Egypt',
    '504': 'Morocco',
    '076': 'Brazil',
    '608': 'Philippines',
    '392': 'Japan',
    '156': 'China',
    '840': 'United States',
    '826': 'United Kingdom',
    '276': 'Germany',
    '724': 'Spain',
    '380': 'Italy',
    '124': 'Canada',
    '036': 'Australia',
    '484': 'Mexico',
    '616': 'Poland',
    '528': 'Netherlands',
    '056': 'Belgium',
    '752': 'Sweden',
    '578': 'Norway',
    '208': 'Denmark',
    '246': 'Finland',
    '300': 'Greece',
    '620': 'Portugal',
    '032': 'Argentina',
    '170': 'Colombia',
    '152': 'Chile',
    '604': 'Peru',
    '862': 'Venezuela',
    '458': 'Malaysia',
    '702': 'Singapore',
    '710': 'South Africa',
    '404': 'Kenya',
    '288': 'Ghana',
    '682': 'Saudi Arabia',
    '784': 'UAE',
    '376': 'Israel',
    '203': 'Czech Republic',
    '642': 'Romania',
    '348': 'Hungary',
    '756': 'Switzerland',
    '040': 'Austria',
    '372': 'Ireland',
    '554': 'New Zealand',
    '012': 'Algeria',
    '788': 'Tunisia',
    '524': 'Nepal',
    '144': 'Sri Lanka',
};

interface RegionData {
    region: string;
    user_count: number;
    total_contributions: number;
}

interface TooltipData {
    name: string;
    users: number;
    contributions: number;
    x: number;
    y: number;
}

export default function GlobalPage() {
    const [regionData, setRegionData] = useState<RegionData[]>([]);
    const [countryData, setCountryData] = useState<Map<string, RegionData>>(new Map());
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

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
                            if (row.region) {
                                const existing = regionMap.get(row.region) || { user_count: 0, total_contributions: 0 };
                                existing.user_count += 1;
                                existing.total_contributions += row.total_messages || 0;
                                regionMap.set(row.region, existing);
                            }
                        });
                        offset += batchSize;
                        hasMore = data.length === batchSize;
                    } else {
                        hasMore = false;
                    }
                }

                const regions = Array.from(regionMap.entries())
                    .map(([region, data]) => ({
                        region,
                        ...data,
                    }))
                    .sort((a, b) => b.user_count - a.user_count);

                setRegionData(regions);

                // Convert to country code map
                const countryMap = new Map<string, RegionData>();
                regions.forEach(r => {
                    const code = regionToCountryId[r.region];
                    if (code) {
                        countryMap.set(code, r);
                    }
                });
                setCountryData(countryMap);
            } catch (err) {
                console.error('Error fetching regions:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchRegions();
    }, []);

    const getColor = (countryCode: string) => {
        const data = countryData.get(countryCode);
        if (!data) return '#1a1a1a';

        const maxUsers = Math.max(...regionData.map(r => r.user_count), 1);
        const intensity = Math.log(data.user_count + 1) / Math.log(maxUsers + 1);

        // Gold gradient from dark to bright
        // Base gold: 212, 175, 55
        const r = Math.round(40 + intensity * (212 - 40));
        const g = Math.round(40 + intensity * (175 - 40));
        const b = Math.round(40 + intensity * (55 - 40));

        return `rgb(${r}, ${g}, ${b})`;
    };

    const handleMoveEnd = (pos: { coordinates: [number, number]; zoom: number }) => {
        setPosition(pos);
    };

    const totalUsers = regionData.reduce((sum, r) => sum + r.user_count, 0);
    const totalContributions = regionData.reduce((sum, r) => sum + r.total_contributions, 0);

    if (loading) {
        return <TerminalLoader />;
    }

    return (
        <div className="container" style={{ padding: '40px 20px', maxWidth: 1400 }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ marginBottom: 8 }}>Global Community</h1>
                <p className="text-muted">
                    Visualizing the worldwide distribution of Seismic community members
                </p>
            </div>

            {/* Stats Bar */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginBottom: 32,
                maxWidth: 800,
                margin: '0 auto 32px auto',
            }}>
                <div className="card" style={{ textAlign: 'center', padding: 20 }}>
                    <div className="stat-value text-primary">{regionData.length}</div>
                    <div className="stat-label">Regions</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 20 }}>
                    <div className="stat-value">{totalUsers.toLocaleString()}</div>
                    <div className="stat-label">Community Members</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 20 }}>
                    <div className="stat-value text-accent">{totalContributions.toLocaleString()}</div>
                    <div className="stat-label">Total Contributions</div>
                </div>
            </div>

            {/* Map Container */}
            <div className="card" style={{
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                background: '#0a0a0a',
                borderRadius: 16,
            }}>
                {/* Tooltip */}
                {tooltip && (
                    <div style={{
                        position: 'absolute',
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -120%)',
                        background: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid var(--seismic-primary)',
                        borderRadius: 8,
                        padding: '12px 16px',
                        zIndex: 100,
                        pointerEvents: 'none',
                        minWidth: 150,
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--seismic-primary)' }}>
                            {tooltip.name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--seismic-white)' }}>
                            {tooltip.users.toLocaleString()} members
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--seismic-gray-400)' }}>
                            {tooltip.contributions.toLocaleString()} contributions
                        </div>
                    </div>
                )}

                {/* Map */}
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 140,
                        center: [0, 30],
                    }}
                    style={{
                        width: '100%',
                        height: 'auto',
                        aspectRatio: '2 / 1',
                    }}
                >
                    <ZoomableGroup
                        center={position.coordinates}
                        zoom={position.zoom}
                        onMoveEnd={handleMoveEnd}
                        minZoom={1}
                        maxZoom={8}
                    >
                        <Geographies geography={geoUrl}>
                            {({ geographies }) =>
                                geographies.map((geo) => {
                                    // Use geo.id for numeric code match, fallback to ISO_A3 if needed (though our map uses numeric)
                                    const countryCode = geo.id || geo.properties.ISO_A3;
                                    const data = countryData.get(countryCode);
                                    const hasData = !!data;

                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill={getColor(countryCode)}
                                            stroke={hasData ? '#D4AF37' : '#333'}
                                            strokeWidth={hasData ? 1.5 : 0.5}
                                            style={{
                                                default: {
                                                    outline: 'none',
                                                    filter: hasData ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))' : 'none',
                                                },
                                                hover: {
                                                    fill: hasData ? 'var(--seismic-primary)' : '#2a2a2a',
                                                    outline: 'none',
                                                    cursor: hasData ? 'pointer' : 'default',
                                                    filter: hasData ? 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.9))' : 'none',
                                                },
                                                pressed: { outline: 'none' },
                                            }}
                                            onMouseEnter={(e) => {
                                                if (data) {
                                                    const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
                                                    if (rect) {
                                                        setTooltip({
                                                            name: countryIdToName[countryCode] || geo.properties.name || countryCode,
                                                            users: data.user_count,
                                                            contributions: data.total_contributions,
                                                            x: e.clientX - rect.left,
                                                            y: e.clientY - rect.top,
                                                        });
                                                    }
                                                }
                                            }}
                                            onMouseMove={(e) => {
                                                if (data && tooltip) {
                                                    const rect = (e.target as Element).closest('svg')?.getBoundingClientRect();
                                                    if (rect) {
                                                        setTooltip({
                                                            ...tooltip,
                                                            x: e.clientX - rect.left,
                                                            y: e.clientY - rect.top,
                                                        });
                                                    }
                                                }
                                            }}
                                            onMouseLeave={() => setTooltip(null)}
                                        />
                                    );
                                })
                            }
                        </Geographies>
                    </ZoomableGroup>
                </ComposableMap>

                {/* Zoom Controls */}
                <div style={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))}
                        style={{ width: 40, height: 40, padding: 0, fontSize: '1.2rem' }}
                    >
                        +
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))}
                        style={{ width: 40, height: 40, padding: 0, fontSize: '1.2rem' }}
                    >
                        −
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setPosition({ coordinates: [0, 20], zoom: 1 })}
                        style={{ width: 40, height: 40, padding: 0, fontSize: '0.7rem' }}
                        title="Reset view"
                    >
                        ↺
                    </button>
                </div>

                {/* Legend */}
                <div style={{
                    position: 'absolute',
                    bottom: 20,
                    left: 20,
                    background: 'rgba(0, 0, 0, 0.8)',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--seismic-gray-800)',
                }}>
                    <div style={{ fontSize: '0.75rem', marginBottom: 8, color: 'var(--seismic-gray-400)' }}>
                        Member Density
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <div style={{
                            width: 120,
                            height: 12,
                            borderRadius: 6,
                            background: 'linear-gradient(to right, #1a1a1a 0%, #D4AF37 100%)',
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: 120, marginTop: 4 }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--seismic-gray-500)' }}>Low</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--seismic-primary)' }}>High</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Regions List */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3 className="card-title">Top 10 Regions</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {regionData.slice(0, 10).map((region, index) => (
                        <div
                            key={region.region}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '12px 16px',
                                background: 'var(--seismic-gray-900)',
                                borderRadius: 8,
                                border: index < 3 ? '1px solid var(--seismic-primary)' : '1px solid var(--seismic-gray-800)',
                            }}
                        >
                            <span
                                className="rank-badge"
                                style={{
                                    background: index < 3 ? 'var(--seismic-primary)' : 'var(--seismic-gray-700)',
                                    color: index < 3 ? '#000' : 'var(--seismic-white)',
                                    minWidth: 28,
                                    height: 28,
                                }}
                            >
                                {index + 1}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{region.region}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--seismic-gray-400)' }}>
                                    {region.user_count.toLocaleString()} members • {region.total_contributions.toLocaleString()} contributions
                                </div>
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--seismic-primary)',
                            }}>
                                {((region.user_count / totalUsers) * 100).toFixed(1)}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CSS for glow animation */}
            <style jsx global>{`
                @keyframes countryGlow {
                    0%, 100% {
                        filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.5));
                    }
                    50% {
                        filter: drop-shadow(0 0 12px rgba(212, 175, 55, 0.8));
                    }
                }
                
                .country-active {
                    animation: countryGlow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
