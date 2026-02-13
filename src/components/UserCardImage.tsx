'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { SeismicUser } from '@/types/database';
import { MAGNITUDE_COLORS, DEFAULT_THEME_COLOR } from '@/lib/constants';
import { getHighestMagnitudeRole } from '@/lib/roleUtils';

interface UserCardImageProps {
    user: SeismicUser;
    rankInfo: {
        totalRank: number;
        tweetRank: number;
        artRank: number;
        totalUsers: number;
        roleRank: number | null;
    } | null;
}

// Canvas dimensions
const W = 600;
const H = 380;
const DPR = 2; // 2x for retina

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

// Elegant Outline Badge
function drawBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): number {
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    const tw = ctx.measureText(text).width;
    const pw = 10, ph = 4, br = 6;
    const bw = tw + pw * 2;
    const bh = 14 + ph * 2;

    // Dark background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    roundRect(ctx, x, y, bw, bh, br);
    ctx.fill();

    // Thin elegant border
    ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, bw, bh, br);
    ctx.stroke();

    // Text (Subtle white)
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + bw / 2, y + bh / 2 + 3.5);
    ctx.textAlign = 'left';

    return bw;
}

async function drawCard(
    canvas: HTMLCanvasElement,
    user: SeismicUser,
    rankInfo: UserCardImageProps['rankInfo']
) {
    const ctx = canvas.getContext('2d')!;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(DPR, DPR);

    const mag = getMagnitude(user.roles);
    const themeColor = MAGNITUDE_COLORS[Math.floor(mag)] || DEFAULT_THEME_COLOR;
    const percentile = rankInfo
        ? Math.max(0, Math.min(100, ((rankInfo.totalUsers - rankInfo.totalRank) / rankInfo.totalUsers) * 100))
        : null;
    const topPercent = percentile !== null ? (100 - percentile).toFixed(2) : null;

    // === BACKGROUND (Dark Elegant) ===
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#050505'); // Almost black
    bg.addColorStop(1, '#0f0f0f');
    roundRect(ctx, 0, 0, W, H, 20);
    ctx.fillStyle = bg;
    ctx.fill();

    // Very subtle noise pattern or texture could go here
    // For now, just a faint top highlight
    const highlight = ctx.createLinearGradient(0, 0, 0, H);
    highlight.addColorStop(0, 'rgba(255,255,255,0.03)');
    highlight.addColorStop(0.1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlight;
    ctx.fillRect(0, 0, W, H);

    // Subtle colored glow only at top right (near role)
    // Subtle colored glow only at top right (near role) - Enhanced for "more alive" feel
    const glow = ctx.createRadialGradient(W - 50, 50, 0, W - 50, 50, 250);
    glow.addColorStop(0, `${themeColor}25`); // Slightly stronger glow
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Elegant Border (Dark Grey, not colored)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 1, 1, W - 2, H - 2, 20);
    ctx.stroke();

    // === AVATAR ===
    const avatarSize = 60;
    const avatarX = 30;
    const avatarY = 30;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    try {
        if (user.avatar_url) {
            const avatarImg = await loadImage(user.avatar_url);
            ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(user.username[0].toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 8);
        }
    } catch {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    // Avatar ring (Darker, cleaner)
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // === ROLE ICON ===
    const highestRole = getHighestMagnitudeRole(user.roles);
    if (highestRole) {
        try {
            const match = highestRole.match(/Magnitude (\d+)/);
            if (match) {
                const magNum = match[1];
                const iconPath = `/icon_role/mag${magNum}.webp`;
                const roleImg = await loadImage(iconPath);

                // Aspect Ratio Logic
                const maxSize = 38;
                const ratio = Math.min(maxSize / roleImg.width, maxSize / roleImg.height);
                const dw = roleImg.width * ratio;
                const dh = roleImg.height * ratio;

                // Center position
                const cx = W - 30 - 20; // 30px padding + half of 40px area
                const cy = 30 + 20;     // 30px padding + half of 40px area

                // Icon Glow
                const iconGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
                iconGlow.addColorStop(0, `${themeColor}40`);
                iconGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = iconGlow;
                ctx.beginPath();
                ctx.arc(cx, cy, 30, 0, Math.PI * 2);
                ctx.fill();

                ctx.drawImage(roleImg, cx - dw / 2, cy - dh / 2, dw, dh);
            }
        } catch { /* ignore */ }
    }

    // === INFO TEXT ===
    const textX = avatarX + avatarSize + 16;

    // Display Name (Clean White)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    const displayName = user.display_name || user.username;
    let name = displayName;
    // Simple truncation
    if (name.length > 20) name = name.substring(0, 18) + '...';
    ctx.fillText(name, textX, avatarY + 24);

    // Username (Muted Gray)
    ctx.fillStyle = '#888';
    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.fillText(`@${user.username}`, textX, avatarY + 46);

    // Region Badge (Small & Minimal)
    if (user.region) {
        const joined = user.joined_at ? new Date(user.joined_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '';
        const metaText = joined ? `Joined ${joined}  •  ${user.region}` : user.region;

        ctx.fillStyle = '#555';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.fillText(metaText, textX, avatarY + 68);
    } // statsY starts below

    // === STATS SECTION (Clean Grid) ===
    const statsY = 120;

    // Separator line
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, statsY);
    ctx.lineTo(W - 30, statsY);
    ctx.stroke();

    const stats = [
        { value: user.total_messages, label: 'Contributions' },
        { value: user.tweet, label: 'Tweets' },
        { value: user.art, label: 'Artworks' },
    ];

    const colW = (W - 60) / 3;

    stats.forEach((stat, i) => {
        const cx = 30 + colW * i + colW / 2;
        const cy = statsY + 35;

        // Value (White, Elegant font)
        ctx.fillStyle = '#fff';
        ctx.font = '600 24px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(stat.value.toLocaleString(), cx, cy);

        // Label (Dark Gray)
        ctx.fillStyle = '#666';
        ctx.font = '500 11px Inter, system-ui, sans-serif';
        ctx.fillText(stat.label.toUpperCase(), cx, cy + 20);
    });
    ctx.textAlign = 'left';

    // === PERCENTILE BANNER (Minimalist) ===
    const bannerY = statsY + 80;
    if (topPercent) {
        // Background container (Very dark, subtle border)
        roundRect(ctx, 30, bannerY, W - 60, 56, 12);
        const bannerBg = ctx.createLinearGradient(30, bannerY, W - 30, bannerY);
        bannerBg.addColorStop(0, 'rgba(255,255,255,0.03)');
        bannerBg.addColorStop(1, 'rgba(255,255,255,0.01)');
        ctx.fillStyle = bannerBg;
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.stroke();

        ctx.textAlign = 'center';

        // Text part 1
        ctx.fillStyle = '#888';
        ctx.font = '12px Inter, system-ui, sans-serif';
        const centerX = W / 2;

        ctx.fillText("You are in the", centerX, bannerY + 20);

        // Text part 2 (Accent Color)
        ctx.fillStyle = themeColor; // Only spot using main color
        ctx.font = '700 18px "Courier New", monospace';
        ctx.fillText(`TOP ${topPercent}%`, centerX, bannerY + 42);

        ctx.textAlign = 'left';
    }

    // === CONTRIBUTIONS BAR (Thin & Clean) ===
    const barY = bannerY + 76;
    const barW = W - 60;
    const barH = 4; // Thinner

    // Track background
    roundRect(ctx, 30, barY, barW, barH, 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    if (user.total_messages > 0) {
        const tweetW = (user.tweet / user.total_messages) * barW;
        const artW = (user.art / user.total_messages) * barW;

        // Muted Blue
        if (tweetW > 0) {
            roundRect(ctx, 30, barY, tweetW, barH, 2);
            ctx.fillStyle = '#3b82f6';
            ctx.fill();
        }
        // Muted Pink
        if (artW > 0) {
            roundRect(ctx, 30 + tweetW, barY, artW, barH, 2);
            ctx.fillStyle = '#d946ef';
            ctx.fill();
        }
    }

    // === BADGES ROW (Bottom) ===
    const badgeY = barY + 25;
    const achievements: { label: string; color: string; priority: number }[] = [];
    const activityDays = (user.first_message_date && user.last_message_date)
        ? Math.max(1, Math.ceil((new Date(user.last_message_date).getTime() - new Date(user.first_message_date).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;

    // --- Badge Logic ---
    // 1. Tenure & Activity Consistency
    if (user.first_message_date && new Date(user.first_message_date) < new Date('2024-06-01'))
        achievements.push({ label: 'Early Adopter', color: '#fff', priority: 5 });

    if (activityDays >= 90)
        achievements.push({ label: 'Veteran', color: '#a3a3a3', priority: 3 });
    else if (activityDays >= 30)
        achievements.push({ label: 'Consistent', color: '#fff', priority: 2 });

    // 2. Volume Milestones
    if (user.total_messages >= 5000)
        achievements.push({ label: 'Relentless', color: '#ef4444', priority: 10 }); // Red/Orange
    else if (user.total_messages >= 1000)
        achievements.push({ label: 'Diamond', color: '#38bdf8', priority: 6 }); // Cyan

    // 3. Specialization
    const artRatio = user.total_messages > 0 ? user.art / user.total_messages : 0;
    const tweetRatio = user.total_messages > 0 ? user.tweet / user.total_messages : 0;

    if (user.art >= 100)
        achievements.push({ label: 'Artistic Soul', color: '#f472b6', priority: 4 });

    if (user.tweet >= 500)
        achievements.push({ label: 'Voice of Seismic', color: '#818cf8', priority: 4 });

    if (user.total_messages > 200 && artRatio >= 0.4 && tweetRatio >= 0.4)
        achievements.push({ label: 'Balanced Force', color: '#34d399', priority: 5 }); // Green

    // 4. Performance
    if (rankInfo && (rankInfo.totalRank / rankInfo.totalUsers) <= 0.01)
        achievements.push({ label: 'Top 1% Elite', color: '#fbbf24', priority: 20 }); // Gold
    else if (rankInfo && (rankInfo.totalRank / rankInfo.totalUsers) <= 0.1)
        achievements.push({ label: 'Top 10%', color: '#fbbf24', priority: 8 });

    // 5. Momentum
    const msgsPerDay = user.total_messages / activityDays;
    if (msgsPerDay > 15)
        achievements.push({ label: 'High Octane', color: '#f59e0b', priority: 7 });

    // Rising Star: Joined recently (< 45 days) but high activity (> 300 msgs)
    const joinedDays = user.joined_at
        ? Math.ceil((new Date().getTime() - new Date(user.joined_at).getTime()) / (1000 * 60 * 60 * 24))
        : activityDays;

    if (joinedDays < 45 && user.total_messages > 300)
        achievements.push({ label: 'Rising Star', color: '#facc15', priority: 9 });

    // Sort by priority (descending) and take top 5
    achievements.sort((a, b) => b.priority - a.priority);

    let bx = 30;
    achievements.slice(0, 5).forEach(ach => {
        // Fallback color to white if theme color logic was too complex for this snippet
        const w = drawBadge(ctx, ach.label, bx, badgeY, ach.color);
        bx += w + 8;
    });

    // === WATERMARK (Subtle) ===
    const wmY = H - 20;
    ctx.fillStyle = '#333';
    ctx.font = '400 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('seismic.rizzgm.xyz', W - 30, wmY);
    ctx.textAlign = 'left';
}

export default function UserCardImage({ user, rankInfo }: UserCardImageProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ready, setReady] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

    const renderCard = useCallback(async () => {
        if (!canvasRef.current) return;
        try {
            await drawCard(canvasRef.current, user, rankInfo);
            setReady(true);
        } catch (err) {
            console.error('Failed to render card image:', err);
        }
    }, [user, rankInfo]);

    useEffect(() => {
        renderCard();
    }, [renderCard]);

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `${user.username}-seismic-card.png`;
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

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* Canvas */}
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

            {/* Buttons */}
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
                        onClick={() => {
                            const percentText = rankInfo ? ((rankInfo.totalUsers - rankInfo.totalRank) / rankInfo.totalUsers * 100).toFixed(2) : '';
                            const topBadge = rankInfo && (rankInfo.totalRank / rankInfo.totalUsers) <= 0.01 ? 'Top 1% Elite' : user.total_messages > 1000 ? 'Diamond' : 'Member';

                            const text = `Just checked my Seismic stats! 🚀\n\nI'm in the ${percentText}% (Rank #${rankInfo?.totalRank}) with the ${topBadge} badge!\n\nCheck yours here: seismic.rizzgm.xyz\n\n@Seismic_X #SeismicCommunity`;
                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                        }}
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
                            color: '#fff'
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
