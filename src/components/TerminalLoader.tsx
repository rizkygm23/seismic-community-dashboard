'use client';

import { useState, useEffect } from 'react';

const LOGS = [
    'Connection established.',
    'Verifying cryptographic keys...',
    'Fetching community metrics...',
    'Decrypting user blocks...',
    'Analyzing seismic activity...',
    'Rendering dashboard...',
];

export default function TerminalLoader() {
    const [lines, setLines] = useState<string[]>([]);
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        const cursorInterval = setInterval(() => setCursorVisible(v => !v), 500);

        let currentIndex = 0;
        // Start lines immediately

        const lineInterval = setInterval(() => {
            if (currentIndex < LOGS.length) {
                const nextLine = LOGS[currentIndex];
                setLines(prev => [...prev, nextLine]);
                currentIndex++;
            } else {
                clearInterval(lineInterval);
            }
        }, 200);

        return () => {
            clearInterval(cursorInterval);
            clearInterval(lineInterval);
        };
    }, []);

    return (
        <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9375rem',
            color: 'var(--seismic-primary)',
            background: 'rgba(10, 10, 10, 0.95)',
            padding: '24px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--seismic-gray-800)',
            width: '100%',
            maxWidth: '600px',
            margin: '60px auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            minHeight: '320px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Terminal Header */}
            <div style={{
                borderBottom: '1px solid var(--seismic-gray-800)',
                paddingBottom: 16,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                <div style={{
                    marginLeft: 'auto',
                    fontSize: '0.75rem',
                    color: 'var(--seismic-gray-500)',
                    fontFamily: 'var(--font-main)'
                }}>
                    bash — seismic-cli
                </div>
            </div>

            {/* Terminal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lines.map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, animation: 'fadeIn 0.2s ease-out forwards', opacity: 0 }}>
                        <span style={{ color: 'var(--seismic-gray-600)', userSelect: 'none' }}>➜</span>
                        <span style={{ color: i === lines.length - 1 ? 'var(--seismic-white)' : 'var(--seismic-primary)' }}>
                            {line}
                        </span>
                    </div>
                ))}

                <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: 'var(--seismic-primary)', userSelect: 'none' }}>➜</span>
                    <span style={{ color: 'var(--seismic-white)' }}>
                        <span style={{ opacity: cursorVisible ? 1 : 0, backgroundColor: 'var(--seismic-primary)', color: 'var(--seismic-black)', padding: '0 4px' }}>_</span>
                    </span>
                </div>
            </div>

            {/* Scanline Effect */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                backgroundSize: '100% 2px, 3px 100%',
                pointerEvents: 'none',
                opacity: 0.3
            }} />

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
