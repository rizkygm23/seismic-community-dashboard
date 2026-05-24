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
            fontFamily: 'var(--font-main)',
            fontSize: '0.9375rem',
            color: 'var(--seismic-ink)',
            background: 'var(--seismic-canvas)',
            padding: '24px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--seismic-hairline)',
            width: '100%',
            maxWidth: '600px',
            margin: '60px auto',
            boxShadow: 'var(--shadow-sm)',
            
            minHeight: '320px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                borderBottom: '1px solid var(--seismic-hairline)',
                paddingBottom: 16,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--seismic-plum)' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--seismic-gray-300)' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--seismic-ink)' }} />
                <div style={{
                    marginLeft: 'auto',
                    fontSize: '0.75rem',
                    color: 'var(--seismic-mute)',
                    fontFamily: 'var(--font-main)'
                }}>
                    community index
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lines.map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, animation: 'fadeIn 0.2s ease-out forwards', opacity: 0 }}>
                        <span style={{ color: 'var(--seismic-plum)', userSelect: 'none' }}>-</span>
                        <span style={{ color: i === lines.length - 1 ? 'var(--seismic-ink)' : 'var(--seismic-mute)' }}>
                            {line}
                        </span>
                    </div>
                ))}

                <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: 'var(--seismic-plum)', userSelect: 'none' }}>-</span>
                    <span style={{ color: 'var(--seismic-ink)' }}>
                        <span style={{ opacity: cursorVisible ? 1 : 0, backgroundColor: 'var(--seismic-ink)', color: 'var(--seismic-canvas)', padding: '0 4px' }}>_</span>
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
                background: 'none',
                backgroundSize: 'auto',
                pointerEvents: 'none',
                opacity: 0
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

