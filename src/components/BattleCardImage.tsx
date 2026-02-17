'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { SeismicUser } from '@/types/database_manual';
import { MAGNITUDE_COLORS, DEFAULT_THEME_COLOR } from '@/lib/constants';
import { getHighestMagnitudeRole } from '@/lib/roleUtils';

interface BattleCardImageProps {
    user1: SeismicUser;
    user2: SeismicUser;
    user1Rank: { total: number; tweet: number; art: number };
    user2Rank: { total: number; tweet: number; art: number };
    totalUsers: number;
    winner: 'user1' | 'user2' | null;
    onShare?: (text: string) => void;
}

const W = 700;
const H = 530;
const DPR = 2;

function getMagnitude(roles: string[] | null): number {
    if (!roles) return 0;
    let highest = 0;
    roles.forEach(role => {
        const match = role.match(/^Magnitude (\d+\.?\d*)$/);
        if (match) {
            const val = parseFloat(match[1]);
            if (val > highest) highest = val;
        }
    });
    return highest;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;
    });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

async function drawAvatar(
    ctx: CanvasRenderingContext2D,
    user: SeismicUser,
    cx: number,
    cy: number,
    size: number
) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    try {
        if (user.avatar_url) {
            const img = await loadImage(user.avatar_url);
            ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${size * 0.4}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(user.username[0].toUpperCase(), cx, cy + size * 0.13);
        }
    } catch {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    }
    ctx.restore();

    // Ring
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

async function drawRoleIcon(
    ctx: CanvasRenderingContext2D,
    user: SeismicUser,
    x: number,
    y: number,
    maxSize: number
) {
    const highestRole = getHighestMagnitudeRole(user.roles);
    if (!highestRole) return;
    try {
        const match = highestRole.match(/Magnitude (\d+)/);
        if (match) {
            const iconPath = `/icon_role/mag${match[1]}.webp`;
            const roleImg = await loadImage(iconPath);
            const ratio = Math.min(maxSize / roleImg.width, maxSize / roleImg.height);
            const dw = roleImg.width * ratio;
            const dh = roleImg.height * ratio;
            ctx.drawImage(roleImg, x - dw / 2, y - dh / 2, dw, dh);
        }
    } catch { /* ignore */ }
}

async function drawBattleCard(
    canvas: HTMLCanvasElement,
    props: BattleCardImageProps
) {
    const { user1, user2, user1Rank, user2Rank, totalUsers, winner } = props;
    const ctx = canvas.getContext('2d')!;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(DPR, DPR);

    const mag1 = getMagnitude(user1.roles);
    const mag2 = getMagnitude(user2.roles);
    const color1 = MAGNITUDE_COLORS[Math.floor(mag1)] || DEFAULT_THEME_COLOR;
    const color2 = MAGNITUDE_COLORS[Math.floor(mag2)] || DEFAULT_THEME_COLOR;

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#050505');
    bg.addColorStop(1, '#0f0f0f');
    roundRect(ctx, 0, 0, W, H, 20);
    ctx.fillStyle = bg;
    ctx.fill();

    // Subtle highlights
    const hl = ctx.createLinearGradient(0, 0, 0, H);
    hl.addColorStop(0, 'rgba(255,255,255,0.03)');
    hl.addColorStop(0.1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, W, H);

    // Colored glows (subtle)
    const glow1 = ctx.createRadialGradient(100, 80, 0, 100, 80, 200);
    glow1.addColorStop(0, `${color1}15`);
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W - 100, 80, 0, W - 100, 80, 200);
    glow2.addColorStop(0, `${color2}15`);
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 1, 1, W - 2, H - 2, 20);
    ctx.stroke();

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('SEISMIC COMMUNITY BATTLE', W / 2, 30);

    // === PLAYER 1 (LEFT) ===
    const p1x = W * 0.25;
    const avatarY = 85;
    const avatarSize = 56;

    await drawAvatar(ctx, user1, p1x, avatarY, avatarSize);
    await drawRoleIcon(ctx, user1, p1x + avatarSize / 2 + 6, avatarY - avatarSize / 2 + 6, 22);

    // Winner crown
    if (winner === 'user1') {
        ctx.font = '16px serif';
        ctx.fillText('👑', p1x, avatarY - avatarSize / 2 - 8);
    }

    const name1 = (user1.display_name || user1.username).split('#')[0];
    const displayName1 = name1.length > 14 ? name1.substring(0, 12) + '..' : name1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText(displayName1, p1x, avatarY + avatarSize / 2 + 22);

    ctx.fillStyle = '#888';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(`Mag ${mag1}.0  ·  Rank #${user1Rank.total}`, p1x, avatarY + avatarSize / 2 + 40);

    // === VS ===
    ctx.fillStyle = '#444';
    ctx.font = '800 20px Inter, system-ui, sans-serif';
    ctx.fillText('VS', W / 2, avatarY + 8);

    // === PLAYER 2 (RIGHT) ===
    const p2x = W * 0.75;

    await drawAvatar(ctx, user2, p2x, avatarY, avatarSize);
    await drawRoleIcon(ctx, user2, p2x + avatarSize / 2 + 6, avatarY - avatarSize / 2 + 6, 22);

    if (winner === 'user2') {
        ctx.font = '16px serif';
        ctx.fillText('👑', p2x, avatarY - avatarSize / 2 - 8);
    }

    const name2 = (user2.display_name || user2.username).split('#')[0];
    const displayName2 = name2.length > 14 ? name2.substring(0, 12) + '..' : name2;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText(displayName2, p2x, avatarY + avatarSize / 2 + 22);

    ctx.fillStyle = '#888';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(`Mag ${mag2}.0  ·  Rank #${user2Rank.total}`, p2x, avatarY + avatarSize / 2 + 40);

    // === SEPARATOR ===
    const sepY = 175;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, sepY);
    ctx.lineTo(W - 30, sepY);
    ctx.stroke();

    // === STATS COMPARISON ===
    const stats = [
        { label: 'CONTRIBUTIONS', v1: user1.total_messages, v2: user2.total_messages },
        { label: 'TWEETS', v1: user1.tweet, v2: user2.tweet },
        { label: 'ARTWORKS', v1: user1.art, v2: user2.art },
        { label: 'CHAT', v1: user1.general_chat + user1.devnet_chat + user1.report_chat, v2: user2.general_chat + user2.devnet_chat + user2.report_chat },
    ];

    const statStartY = 200;
    const rowH = 50;

    stats.forEach((stat, i) => {
        const y = statStartY + i * rowH;
        const total = stat.v1 + stat.v2;
        const pct1 = total > 0 ? stat.v1 / total : 0.5;
        const w1 = stat.v1 > stat.v2;
        const w2 = stat.v2 > stat.v1;

        // Label (center)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666';
        ctx.font = '500 10px Inter, system-ui, sans-serif';
        ctx.fillText(stat.label, W / 2, y);

        // Left value
        ctx.textAlign = 'right';
        ctx.fillStyle = w1 ? color1 : '#888';
        ctx.font = `${w1 ? '700' : '500'} 18px Inter, system-ui, sans-serif`;
        ctx.fillText(stat.v1.toLocaleString(), W / 2 - 70, y + 24);

        // Right value
        ctx.textAlign = 'left';
        ctx.fillStyle = w2 ? color2 : '#888';
        ctx.font = `${w2 ? '700' : '500'} 18px Inter, system-ui, sans-serif`;
        ctx.fillText(stat.v2.toLocaleString(), W / 2 + 70, y + 24);

        // Bar
        const barW = 100;
        const barH = 3;
        const barX = W / 2 - barW / 2;
        const barY = y + 30;

        roundRect(ctx, barX, barY, barW, barH, 1.5);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();

        // Left fill
        const leftW = pct1 * barW - 1;
        if (leftW > 0) {
            roundRect(ctx, barX, barY, leftW, barH, 1.5);
            ctx.fillStyle = w1 ? color1 : '#333';
            ctx.fill();
        }
        // Right fill
        const rightW = (1 - pct1) * barW - 1;
        if (rightW > 0) {
            roundRect(ctx, barX + leftW + 2, barY, rightW, barH, 1.5);
            ctx.fillStyle = w2 ? color2 : '#333';
            ctx.fill();
        }
    });

    // === WINNER BANNER ===
    const bannerY = statStartY + stats.length * rowH + 20;
    roundRect(ctx, 30, bannerY, W - 60, 44, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    if (winner) {
        const winnerUser = winner === 'user1' ? user1 : user2;
        const winnerName = (winnerUser.display_name || winnerUser.username).split('#')[0];

        ctx.fillStyle = '#666';
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillText('Winner', W / 2, bannerY + 18);

        const winColor = winner === 'user1' ? color1 : color2;
        ctx.fillStyle = winColor;
        ctx.font = '700 14px Inter, system-ui, sans-serif';
        ctx.fillText(winnerName, W / 2, bannerY + 36);
    }

    // === PERCENTILE ROW ===
    const pctY = bannerY + 60;
    const getPercentile = (rank: number) => ((rank / totalUsers) * 100).toFixed(1);

    ctx.fillStyle = '#555';
    ctx.font = '10px Inter, system-ui, sans-serif';

    ctx.textAlign = 'right';
    ctx.fillText(`Top ${getPercentile(user1Rank.total)}%`, W / 2 - 20, pctY);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#333';
    ctx.fillText('PERCENTILE', W / 2, pctY);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#555';
    ctx.fillText(`Top ${getPercentile(user2Rank.total)}%`, W / 2 + 20, pctY);

    // === WATERMARK ===
    ctx.textAlign = 'right';
    ctx.fillStyle = '#333';
    ctx.font = '400 9px Inter, system-ui, sans-serif';
    ctx.fillText('seismic.rizzgm.xyz', W - 30, H - 16);
    ctx.textAlign = 'left';
}

export default function BattleCardImage(props: BattleCardImageProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ready, setReady] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

    const { user1, user2, user1Rank, user2Rank, totalUsers, winner } = props;

    const renderCard = useCallback(async () => {
        if (!canvasRef.current) return;
        try {
            await drawBattleCard(canvasRef.current, props);
            setReady(true);
        } catch (err) {
            console.error('Failed to render battle card:', err);
        }
    }, [user1, user2, user1Rank, user2Rank, totalUsers, winner]);

    useEffect(() => {
        renderCard();
    }, [renderCard]);

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const name1 = (user1.display_name || user1.username).split('#')[0];
        const name2 = (user2.display_name || user2.username).split('#')[0];
        const link = document.createElement('a');
        link.download = `battle-${name1}-vs-${name2}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    };

    const handleCopy = async () => {
        if (!canvasRef.current) return;
        try {
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvasRef.current!.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to create blob'));
                }, 'image/png');
            });
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        } catch {
            setCopyStatus('error');
            setTimeout(() => setCopyStatus('idle'), 2000);
        }
    };

    const handleShare = () => {
        const winnerUser = winner === 'user1' ? user1 : user2;
        const winnerName = (winnerUser.display_name || winnerUser.username).split('#')[0];
        const name1 = (user1.display_name || user1.username).split('#')[0];
        const name2 = (user2.display_name || user2.username).split('#')[0];

        // Tag opponent's X username if available
        const opponentXTag = user2.x_username ? `@${user2.x_username}` : name2;

        const text = [
            `I just had a community battle on @SeismicSys!`,
            ``,
            `${name1} vs ${opponentXTag}`,
            `Contributions: ${user1.total_messages.toLocaleString()} vs ${user2.total_messages.toLocaleString()}`,
            `Tweets: ${user1.tweet.toLocaleString()} vs ${user2.tweet.toLocaleString()}`,
            `Art: ${user1.art.toLocaleString()} vs ${user2.art.toLocaleString()}`,
            `Chat: ${(user1.general_chat + user1.devnet_chat + user1.report_chat).toLocaleString()} vs ${(user2.general_chat + user2.devnet_chat + user2.report_chat).toLocaleString()}`,
            ``,
            `Winner: ${winnerName}`,
            ``,
            `Try it yourself: seismic.rizzgm.xyz/compare`,
            ``,
            `#Seismic`,
        ].join('\n');

        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
                <canvas
                    ref={canvasRef}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        borderRadius: 16,
                    }}
                />
            </div>

            {ready && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 10,
                    marginTop: 14,
                }}>
                    <button
                        onClick={handleDownload}
                        className="btn btn-secondary"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            padding: '14px 10px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                    </button>
                    <button
                        onClick={handleCopy}
                        className="btn btn-secondary"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            padding: '14px 10px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy'}
                    </button>
                    <button
                        onClick={handleShare}
                        className="btn btn-secondary"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            padding: '14px 10px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            backgroundColor: '#000',
                            borderColor: '#333',
                            color: '#fff',
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Share on X
                    </button>
                </div>
            )}
        </div>
    );
}
