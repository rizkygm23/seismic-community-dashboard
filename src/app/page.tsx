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
        <a href="/leaderboard" className="card group" style={{
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
          position: 'relative',
        }}>
          <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--seismic-primary)'
              }} />
              Leaderboard
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </h3>
          <p className="text-muted" style={{ fontSize: '0.9375rem', paddingRight: 24 }}>
            See the top contributors ranked by tweets, art, and overall activity
          </p>
        </a>

        <a href="/leaderboard?type=tweet" className="card group" style={{
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
          position: 'relative',
        }}>
          <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--seismic-secondary)'
              }} />
              Top Tweeters
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </h3>
          <p className="text-muted" style={{ fontSize: '0.9375rem', paddingRight: 24 }}>
            Members who contributed the most in the tweet channel
          </p>
        </a>

        <a href="/leaderboard?type=art" className="card group" style={{
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
          position: 'relative',
        }}>
          <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--seismic-accent)'
              }} />
              Top Artists
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </h3>
          <p className="text-muted" style={{ fontSize: '0.9375rem', paddingRight: 24 }}>
            Members who contributed the most in the art channel
          </p>
        </a>

        <a href="/stats" className="card group" style={{
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-normal)',
          position: 'relative',
        }}>
          <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--seismic-gray-400)'
              }} />
              Statistics
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </h3>
          <p className="text-muted" style={{ fontSize: '0.9375rem', paddingRight: 24 }}>
            Overview of community metrics and activity patterns
          </p>
        </a>
      </div>
    </div>
  );
}
