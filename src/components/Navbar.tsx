'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BarChart3, Globe2, Menu, Search, Trophy, X } from 'lucide-react';

const links = [
    {
        href: '/#search',
        label: 'Search',
        Icon: Search,
    },
    {
        href: '/#leaderboard',
        label: 'Leaderboard',
        Icon: Trophy,
    },
    {
        href: '/#statistics',
        label: 'Statistics',
        Icon: BarChart3,
    },
    {
        href: '/#global',
        label: 'Global',
        Icon: Globe2,
    },

];

export default function Navbar() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeHash, setActiveHash] = useState('#search');

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const syncHash = () => {
            setActiveHash(window.location.hash || '#search');
        };

        syncHash();
        window.addEventListener('hashchange', syncHash);
        return () => window.removeEventListener('hashchange', syncHash);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    return (
        <>
            <nav className="nav">
                <div className="container nav-content">
                    {/* Logo */}
                    <Link href="/" className="nav-brand">
                        <Image
                            src="/logo/logoseismic.png"
                            alt="Seismic logo"
                            width={32}
                            height={32}
                            priority
                            className="block rounded-[4px] object-contain bg-[var(--seismic-canvas)]"
                        />
                        <span className="nav-brand-text">seismic.community</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="nav-links">
                        {links.map((link) => {
                            const linkHash = `#${link.href.split('#')[1]}`;
                            const isActive = pathname === '/' && activeHash === linkHash;
                            const Icon = link.Icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`nav-link ${isActive ? 'active' : ''}`}
                                >
                                    <span className="nav-link-icon">
                                        <Icon size={16} strokeWidth={1.8} />
                                    </span>
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <div className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />

            {/* Mobile Menu Slide-In */}
            <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
                <div style={{ padding: '24px 0' }}>
                    {links.map((link) => {
                        const linkHash = `#${link.href.split('#')[1]}`;
                        const isActive = pathname === '/' && activeHash === linkHash;
                        const Icon = link.Icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`mobile-menu-link ${isActive ? 'active' : ''}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <span style={{ display: 'flex', alignItems: 'center' }}>
                                    <Icon size={16} strokeWidth={1.8} />
                                </span>
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
