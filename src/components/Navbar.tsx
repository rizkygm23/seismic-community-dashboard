'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const links = [
        { href: '/', label: 'Search' },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/stats', label: 'Statistics' },
        { href: '/explore', label: 'Explore' },
        { href: '/compare', label: 'Compare' },
        { href: '/promotion', label: 'Promotion' },
    ];

    return (
        <nav className="nav">
            <div className="container nav-content">
                <Link href="/" className="nav-brand">
                    <img
                        src="/logo/logoseismic.png"
                        alt="Seismic Community"
                        style={{
                            width: 36,
                            height: 36,
                            objectFit: 'contain',
                        }}
                    />
                    <span>Seismic Community</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="nav-links">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`nav-link ${pathname === link.href ? 'active' : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="mobile-menu-btn"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                    style={{
                        display: 'none',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 8,
                        color: 'var(--seismic-gray-300)',
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {mobileMenuOpen ? (
                            <path d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path d="M3 12h18M3 6h18M3 18h18" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="mobile-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--seismic-dark)',
                    borderBottom: '1px solid var(--seismic-gray-800)',
                    padding: '16px 0',
                    animation: 'fadeIn 0.2s ease',
                }}>
                    <div className="container">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                style={{
                                    display: 'block',
                                    padding: '12px 0',
                                    fontSize: '1rem',
                                    color: pathname === link.href ? 'var(--seismic-primary)' : 'var(--seismic-gray-300)',
                                    fontWeight: pathname === link.href ? 600 : 400,
                                    borderBottom: '1px solid var(--seismic-gray-800)',
                                }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
                @media (max-width: 768px) {
                    .nav-links {
                        display: none !important;
                    }
                    .mobile-menu-btn {
                        display: block !important;
                    }
                }
            `}</style>
        </nav>
    );
}
