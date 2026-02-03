import UserSearch from '@/components/UserSearch';

export default function HomePage() {
  return (
    <div className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
      {/* Hero Section */}
      <div className="text-center" style={{ marginBottom: 48 }}>
        <h1 style={{
          fontSize: '2.75rem',
          fontWeight: 800,
          marginBottom: 16,
          letterSpacing: '-0.02em',
        }}>
          Seismic Community Dashboard
        </h1>
        <p className="text-muted" style={{ fontSize: '1.125rem', maxWidth: 500, margin: '0 auto' }}>
          Look up your Discord username to see your contributions and rankings in the Seismic community
        </p>
      </div>

      {/* Search Component */}
      <UserSearch />

      {/* Quick Stats Preview */}
      <div style={{
        marginTop: 80,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
      }}>
        <a href="/leaderboard" className="card" style={{
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
        }}>
          <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--seismic-primary)'
            }} />
            Leaderboard
          </h3>
          <p className="text-muted" style={{ fontSize: '0.9375rem' }}>
            See the top contributors ranked by tweets, art, and overall activity
          </p>
        </a>

        <a href="/leaderboard?type=tweet" className="card" style={{
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
        }}>
          <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--seismic-secondary)'
            }} />
            Top Tweeters
          </h3>
          <p className="text-muted" style={{ fontSize: '0.9375rem' }}>
            Members who contributed the most in the tweet channel
          </p>
        </a>

        <a href="/leaderboard?type=art" className="card" style={{
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
        }}>
          <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--seismic-accent)'
            }} />
            Top Artists
          </h3>
          <p className="text-muted" style={{ fontSize: '0.9375rem' }}>
            Members who contributed the most in the art channel
          </p>
        </a>

        <a href="/stats" className="card" style={{
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
        }}>
          <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--seismic-gray-400)'
            }} />
            Statistics
          </h3>
          <p className="text-muted" style={{ fontSize: '0.9375rem' }}>
            Overview of community metrics and activity patterns
          </p>
        </a>
      </div>
    </div>
  );
}
