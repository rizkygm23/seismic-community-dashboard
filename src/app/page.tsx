'use client';

import UserSearch from '@/components/UserSearch';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const quickLinks = [
    {
      href: '/leaderboard',
      label: 'Leaderboard',
      description: 'See the top contributors ranked by tweets, art, and overall activity',
      color: 'var(--seismic-primary)',
    },
    {
      href: '/leaderboard?type=tweet',
      label: 'Top Tweeters',
      description: 'Members who contributed the most in the tweet channel',
      color: 'var(--seismic-secondary)',
    },
    {
      href: '/leaderboard?type=art',
      label: 'Top Artists',
      description: 'Members who contributed the most in the art channel',
      color: 'var(--seismic-accent)',
    },
    {
      href: '/stats',
      label: 'Statistics',
      description: 'Overview of community metrics and activity patterns',
      color: 'var(--seismic-gray-400)',
    },
    {
      href: '/explore',
      label: 'Explore',
      description: 'Browse members by role and discover the community',
      color: '#9333ea',
    },
    {
      href: '/compare',
      label: 'Compare',
      description: 'Compare two members side by side',
      color: '#06b6d4',
    },
  ];

  return (
    <div className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
      {/* Enhanced Hero Section */}
      <div className="text-center" style={{ marginBottom: 64, opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease', transform: mounted ? 'translateY(0)' : 'translateY(10px)' }}>
        <div style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: '60px', background: 'rgba(212, 187, 110, 0.1)', border: '1px solid rgba(212, 187, 110, 0.2)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--seismic-primary)', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--seismic-primary)', letterSpacing: '0.05em' }}>
            DISCORD COMMUNITY
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 800,
          marginBottom: 16,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, var(--seismic-white) 0%, var(--seismic-gray-200) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Seismic Community Dashboard
        </h1>
        <p className="text-muted" style={{ fontSize: '1.125rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          Discover contributions, rankings, and community insights all in one place. Look up your Discord username to see your impact.
        </p>
      </div>

      {/* Search Component */}
      <UserSearch />

      {/* Enhanced Quick Access Grid */}
      <div style={{
        marginTop: 96,
        marginBottom: 32,
      }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Explore the Community</h2>
          <p className="text-muted">Jump into different views to discover rankings and insights</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {quickLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="card"
              style={{
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, var(--seismic-gray-900) 0%, rgba(212, 187, 110, 0.02) 100%)',
                borderColor: link.color.includes('rgb') ? link.color : 'var(--seismic-gray-800)',
                borderWidth: '2px',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = link.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--seismic-gray-800)';
              }}
            >
              {/* Corner accent */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 100,
                height: 100,
                background: `radial-gradient(circle, ${link.color}15 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{
                  marginBottom: 8,
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--seismic-white)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>{link.label}</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      opacity: 0.5,
                      transition: 'transform var(--transition-normal)',
                      transform: 'translateX(0)',
                    }}
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </h3>

                <p className="text-muted" style={{ fontSize: '0.9375rem', lineHeight: 1.5 }}>
                  {link.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Stats Teaser */}
      <div style={{
        marginTop: 96,
        padding: 40,
        borderRadius: 'var(--border-radius-lg)',
        background: 'linear-gradient(135deg, rgba(212, 187, 110, 0.05) 0%, rgba(130, 90, 96, 0.05) 100%)',
        border: '1px solid var(--seismic-gray-800)',
        textAlign: 'center',
      }}>
        <h3 style={{ marginBottom: 8, fontSize: '1.25rem', fontWeight: 600 }}>Want to dive deeper?</h3>
        <p className="text-muted" style={{ marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
          Explore our comprehensive statistics, role distributions, and member insights
        </p>
        <a href="/stats" className="btn btn-primary">
          View Full Statistics
        </a>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @media (max-width: 768px) {
          div {
            padding-top: 40px !important;
            padding-bottom: 40px !important;
          }
        }
      `}</style>
    </div>
  );
}
