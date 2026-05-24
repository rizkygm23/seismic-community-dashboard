'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { SeismicUser } from '@/types/database_manual';
import { MAGNITUDE_COLORS, DEFAULT_THEME_COLOR } from '@/lib/constants';
import { getHighestMagnitudeRole } from '@/lib/roleUtils';
import { getUserBadges } from '@/lib/badgeUtils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { useShieldedWallet } from 'seismic-react';
import { shieldedWriteContract } from 'seismic-viem';
import { SEISMIC_DISCORD_STAT_ABI } from '@/lib/abi';
import { uploadMetadataToIPFS, uploadFileToIPFS } from '@/lib/pinata';
import { formatEther, type Abi } from 'viem';

const CONTRACT_ADDRESS = "0xd5894c66Cbcbf87514B62a6BFEfb1a3c57E98544";

// Custom Seismic Connect Button that handles balance display gracefully
function SeismicConnectButton() {
    const { address, isConnected } = useAccount();
    const { data: balanceData, isError: balanceError, isLoading: balanceLoading } = useBalance({
        address: address,
        query: {
            enabled: !!address && isConnected,
        }
    });

    // Format balance safely - prevent NaN
    const formattedBalance = (() => {
        if (balanceLoading) return '...';
        if (balanceError || !balanceData) return '0';
        try {
            const raw = formatEther(balanceData.value);
            const num = parseFloat(raw);
            if (isNaN(num)) return '0';
            return num.toFixed(4);
        } catch {
            return '0';
        }
    })();

    return (
        <ConnectButton.Custom>
            {({
                account,
                chain: rkChain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
            }) => {
                const ready = mounted;
                const connected = ready && account && rkChain;

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            style: {
                                opacity: 0,
                                pointerEvents: 'none' as const,
                                userSelect: 'none' as const,
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <button
                                        onClick={openConnectModal}
                                        type="button"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '10px 18px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: 'var(--seismic-canvas)',
                                            background: 'var(--seismic-ink)',
                                            border: '1px solid var(--seismic-ink)',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            transition: 'background-color 0.15s ease, color 0.15s ease',
                                        }}
                                    >
                                        [+] Connect Wallet
                                    </button>
                                );
                            }

                            if (rkChain.unsupported) {
                                return (
                                    <button
                                        onClick={openChainModal}
                                        type="button"
                                        style={{
                                            padding: '10px 18px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: 'var(--seismic-canvas)',
                                            background: '#ff3b30',
                                            border: '1px solid #ff3b30',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        [x] Wrong Network
                                    </button>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button
                                        onClick={openChainModal}
                                        type="button"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '8px 12px',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            color: 'var(--seismic-ink)',
                                            background: 'var(--seismic-canvas)',
                                            border: '1px solid var(--seismic-hairline)',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {rkChain.hasIcon && rkChain.iconUrl && (
                                            <img
                                                alt={rkChain.name ?? 'Chain'}
                                                src={rkChain.iconUrl}
                                                style={{ width: 16, height: 16, borderRadius: 999 }}
                                            />
                                        )}
                                        {rkChain.name ?? 'Seismic'}
                                    </button>

                                    <button
                                        onClick={openAccountModal}
                                        type="button"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '8px 12px',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            color: 'var(--seismic-ink)',
                                            background: 'var(--seismic-canvas)',
                                            border: '1px solid var(--seismic-hairline)',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {formattedBalance} ETH
                                        <span style={{ color: 'var(--seismic-mute)' }}>|</span>
                                        {account.displayName}
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}

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
const VIDEO_SCALE = 2;
const VIDEO_FPS = 30;
const VIDEO_DURATION_MS = 4500;
const VIDEO_BITRATE = 6_000_000;
const VIDEO_UPLOAD_TIMEOUT_MS = 8 * 60 * 1000;

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, unitIndex);
    const decimals = unitIndex === 0 ? 0 : 1;

    return `${value.toFixed(decimals)} ${units[unitIndex]}`;
};

type WindowWithLegacyAudioContext = Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

type MintError = Error & {
    shortMessage?: string;
};

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

function hexToRgb(hex: string): [number, number, number] {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map(char => char + char).join('')
        : normalized.padEnd(6, '0').slice(0, 6);
    const int = parseInt(value, 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function hexToRgba(hex: string, alpha: number) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createVideoBackgroundCanvas(themeColor: string) {
    const canvas = document.createElement('canvas');
    canvas.width = W * VIDEO_SCALE;
    canvas.height = H * VIDEO_SCALE;

    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#020204');
    bg.addColorStop(0.48, '#101015');
    bg.addColorStop(1, '#030305');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const accentGlow = ctx.createRadialGradient(width * 0.78, height * 0.18, 0, width * 0.78, height * 0.18, width * 0.45);
    accentGlow.addColorStop(0, hexToRgba(themeColor, 0.36));
    accentGlow.addColorStop(0.45, hexToRgba(themeColor, 0.08));
    accentGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = accentGlow;
    ctx.fillRect(0, 0, width, height);

    const coolGlow = ctx.createRadialGradient(width * 0.1, height * 0.85, 0, width * 0.1, height * 0.85, width * 0.5);
    coolGlow.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
    coolGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.04)');
    coolGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coolGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
        const y = ((i * 53) % height) + 8;
        ctx.beginPath();
        ctx.moveTo(-80, y);
        ctx.lineTo(width + 80, y - height * 0.34);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    return canvas;
}

function createVideoGlowCanvas(themeColor: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, hexToRgba(themeColor, 0.9));
    gradient.addColorStop(0.45, hexToRgba(themeColor, 0.22));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    return canvas;
}

function createVideoSweepCanvas(themeColor: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.42, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.82)');
    gradient.addColorStop(0.58, hexToRgba(themeColor, 0.35));
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1024);

    return canvas;
}

// Elegant Outline Badge
function drawBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): number {
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    const tw = ctx.measureText(text).width;
    const pw = 10, ph = 4, br = 6;
    const bw = tw + pw * 2;
    const bh = 14 + ph * 2;

    // Background with slight tint of the badge color
    // We need to parse hex to rgba or just use color-mix if canvas supported it (it doesn't easily).
    // Let's stick to dark background but use color for border.
    ctx.fillStyle = 'rgba(25, 25, 25, 0.8)';
    roundRect(ctx, x, y, bw, bh, br);
    ctx.fill();

    // Border using the badge color
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, bw, bh, br);
    ctx.stroke();

    // Text using the badge color
    ctx.fillStyle = color;
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
        { value: user.general_chat + user.devnet_chat + user.report_chat, label: 'Chat' },
    ];

    const colW = (W - 60) / 4;

    stats.forEach((stat, i) => {
        const cx = 30 + colW * i + colW / 2;
        const cy = statsY + 35;

        // Value (White, Elegant font)
        ctx.fillStyle = '#fff';
        ctx.font = '600 20px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(stat.value.toLocaleString(), cx, cy);

        // Label (Dark Gray)
        ctx.fillStyle = '#666';
        ctx.font = '500 10px Inter, system-ui, sans-serif';
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
        achievements.push({ label: 'Early Adopter', color: '#161616', priority: 5 });

    if (activityDays >= 90)
        achievements.push({ label: 'Veteran', color: '#737373', priority: 3 });
    else if (activityDays >= 30)
        achievements.push({ label: 'Consistent', color: '#282826', priority: 2 });

    // 2. Volume Milestones
    if (user.total_messages >= 5000)
        achievements.push({ label: 'Relentless', color: '#523542', priority: 10 });
    else if (user.total_messages >= 1000)
        achievements.push({ label: 'Diamond', color: '#825a6d', priority: 6 });

    // 3. Specialization
    const artRatio = user.total_messages > 0 ? user.art / user.total_messages : 0;
    const tweetRatio = user.total_messages > 0 ? user.tweet / user.total_messages : 0;

    if (user.art >= 100)
        achievements.push({ label: 'Artistic Soul', color: '#825a6d', priority: 4 });

    if (user.tweet >= 500)
        achievements.push({ label: 'Voice of Seismic', color: '#523542', priority: 4 });

    if (user.total_messages > 200 && artRatio >= 0.4 && tweetRatio >= 0.4)
        achievements.push({ label: 'Balanced Force', color: '#737373', priority: 5 });

    // 4. Performance
    if (rankInfo && (rankInfo.totalRank / rankInfo.totalUsers) <= 0.01)
        achievements.push({ label: 'Top 1% Elite', color: '#161616', priority: 20 });
    else if (rankInfo && (rankInfo.totalRank / rankInfo.totalUsers) <= 0.1)
        achievements.push({ label: 'Top 10%', color: '#282826', priority: 8 });

    // 5. Momentum
    const msgsPerDay = user.total_messages / activityDays;
    if (msgsPerDay > 15)
        achievements.push({ label: 'High Octane', color: '#523542', priority: 7 });

    // Rising Star: Joined recently (< 45 days) but high activity (> 300 msgs)
    const joinedDays = user.joined_at
        ? Math.ceil((new Date().getTime() - new Date(user.joined_at).getTime()) / (1000 * 60 * 60 * 24))
        : activityDays;

    if (joinedDays < 45 && user.total_messages > 300)
        achievements.push({ label: 'Rising Star', color: '#825a6d', priority: 9 });

    // 6. Badges (Chat, Devnet, Report)
    const userBadges = getUserBadges(user);
    userBadges.forEach(badge => {
        let priority = 0;
        let color = badge.color;

        if (badge.achieved) {
            if (badge.tier === 'gold') priority = 15;
            else if (badge.tier === 'silver') priority = 12;
            else if (badge.tier === 'bronze') priority = 8;
        } else {
            priority = -10;
            color = '#4a4a4a';
        }

        achievements.push({
            label: badge.label,
            color: color,
            priority: priority
        });
    });

    // Sort by priority (descending)
    achievements.sort((a, b) => b.priority - a.priority);

    let bx = 30;
    let by = badgeY;

    // We can fit roughly 2 rows. Let's try to fit as many as possible within bounds.
    achievements.forEach(ach => {
        // measure width first to check wrap
        ctx.font = '500 10px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(ach.label).width;
        const pw = 10;
        const bw = tw + pw * 2; // logic from drawBadge

        // If this badge would overflow, move to next line
        if (bx + bw > W - 30) {
            bx = 30;
            by += 28; // row height (bh + gap)
        }

        // If we exceed vertical space (reserve ~25px for watermark at bottom), stop drawing
        if (by + 24 > H - 25) return;

        drawBadge(ctx, ach.label, bx, by, ach.color);
        bx += bw + 8;
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
    const [isRecording, setIsRecording] = useState(false);
    const { address, isConnected, chain } = useAccount();
    const [isMinting, setIsMinting] = useState(false);
    const [mintStatus, setMintStatus] = useState('');
    const { walletClient } = useShieldedWallet();
    const [txHash, setTxHash] = useState<string | null>(null);

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

    const handleDownloadImage = () => {
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

    const generateVideoBlob = async (): Promise<Blob> => {
        if (!canvasRef.current) throw new Error('No canvas');
        if (typeof MediaRecorder === 'undefined') {
            throw new Error('Video recording is not supported in this browser.');
        }

        const THREE = await import('three');
        const mag = getMagnitude(user.roles);
        const themeColor = MAGNITUDE_COLORS[Math.floor(mag)] || DEFAULT_THEME_COLOR;
        const durationSec = VIDEO_DURATION_MS / 1000;
        const frameInterval = 1000 / VIDEO_FPS;

        const disposeQueue: Array<{ dispose: () => void }> = [];
        let combinedStream: MediaStream | null = null;
        let audioCtx: AudioContext | null = null;
        let audioSource: AudioBufferSourceNode | null = null;
        let sweepOsc: OscillatorNode | null = null;
        let sparkleOsc: OscillatorNode | null = null;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true
        });
        renderer.setPixelRatio(1);
        renderer.setSize(W * VIDEO_SCALE, H * VIDEO_SCALE, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const cleanup = () => {
            combinedStream?.getTracks().forEach(track => track.stop());
            try { audioSource?.stop(); } catch { }
            try { sweepOsc?.stop(); } catch { }
            try { sparkleOsc?.stop(); } catch { }
            audioSource?.disconnect();
            sweepOsc?.disconnect();
            sparkleOsc?.disconnect();
            if (audioCtx && audioCtx.state !== 'closed') {
                void audioCtx.close();
            }
            disposeQueue.forEach(item => item.dispose());
            renderer.dispose();
        };

        try {
            const scene = new THREE.Scene();
            scene.background = new THREE.Color('#020204');

            const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 1200);
            camera.position.set(0, 0, 540);

            const backgroundTexture = new THREE.CanvasTexture(createVideoBackgroundCanvas(themeColor));
            backgroundTexture.colorSpace = THREE.SRGBColorSpace;
            const backgroundGeometry = new THREE.PlaneGeometry(900, 560);
            const backgroundMaterial = new THREE.MeshBasicMaterial({ map: backgroundTexture });
            const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
            backgroundMesh.position.z = -120;
            scene.add(backgroundMesh);
            disposeQueue.push(backgroundTexture, backgroundGeometry, backgroundMaterial);

            const glowTexture = new THREE.CanvasTexture(createVideoGlowCanvas(themeColor));
            glowTexture.colorSpace = THREE.SRGBColorSpace;
            const glowMaterial = new THREE.SpriteMaterial({
                map: glowTexture,
                transparent: true,
                opacity: 0.28,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const glowSprite = new THREE.Sprite(glowMaterial);
            glowSprite.scale.set(780, 780, 1);
            glowSprite.position.set(120, 20, -70);
            scene.add(glowSprite);
            disposeQueue.push(glowTexture, glowMaterial);

            const texture = new THREE.CanvasTexture(canvasRef.current);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            disposeQueue.push(texture);

            const radius = 20;
            const roundedRectShape = new THREE.Shape();
            const x = -W / 2;
            const y = -H / 2;

            roundedRectShape.moveTo(x, y + radius);
            roundedRectShape.lineTo(x, y + H - radius);
            roundedRectShape.quadraticCurveTo(x, y + H, x + radius, y + H);
            roundedRectShape.lineTo(x + W - radius, y + H);
            roundedRectShape.quadraticCurveTo(x + W, y + H, x + W, y + H - radius);
            roundedRectShape.lineTo(x + W, y + radius);
            roundedRectShape.quadraticCurveTo(x + W, y, x + W - radius, y);
            roundedRectShape.lineTo(x + radius, y);
            roundedRectShape.quadraticCurveTo(x, y, x, y + radius);

            const geometry = new THREE.ExtrudeGeometry(roundedRectShape, {
                depth: 10,
                bevelEnabled: true,
                bevelSegments: 5,
                steps: 1,
                bevelSize: 1.6,
                bevelThickness: 1.8,
                curveSegments: 24
            });
            disposeQueue.push(geometry);

            const position = geometry.attributes.position;
            const uv = geometry.attributes.uv;
            for (let i = 0; i < uv.count; i++) {
                const px = position.getX(i);
                const py = position.getY(i);
                uv.setXY(i, (px + W / 2) / W, (py + H / 2) / H);
            }
            geometry.translate(0, 0, -5);
            geometry.computeVertexNormals();

            const ambientLight = new THREE.HemisphereLight(0xffffff, 0x08080b, 1.8);
            scene.add(ambientLight);

            const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
            keyLight.position.set(-160, 170, 260);
            scene.add(keyLight);

            const rimLight = new THREE.DirectionalLight(themeColor, 2.6);
            rimLight.position.set(260, 80, 180);
            scene.add(rimLight);

            const sparkleLight = new THREE.PointLight(0xffffff, 3.2, 900);
            const accentLight = new THREE.PointLight(themeColor, 4.5, 900);
            const coolLight = new THREE.PointLight(0x38bdf8, 2.6, 900);
            scene.add(sparkleLight, accentLight, coolLight);

            const edgeMaterial = new THREE.MeshStandardMaterial({
                color: 0x0a0a0c,
                roughness: 0.36,
                metalness: 0.78
            });
            const frontMaterial = new THREE.MeshPhysicalMaterial({
                map: texture,
                roughness: 0.22,
                metalness: 0.2,
                clearcoat: 0.65,
                clearcoatRoughness: 0.18
            });
            disposeQueue.push(edgeMaterial, frontMaterial);

            const cardGroup = new THREE.Group();
            const mesh = new THREE.Mesh(geometry, [frontMaterial, edgeMaterial]);
            cardGroup.add(mesh);

            const outlinePoints = roundedRectShape.getPoints(96).map(point => new THREE.Vector3(point.x, point.y, 6.2));
            const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
            const outlineMaterial = new THREE.LineBasicMaterial({
                color: themeColor,
                transparent: true,
                opacity: 0.78
            });
            const outline = new THREE.LineLoop(outlineGeometry, outlineMaterial);
            cardGroup.add(outline);
            disposeQueue.push(outlineGeometry, outlineMaterial);

            const sweepTexture = new THREE.CanvasTexture(createVideoSweepCanvas(themeColor));
            sweepTexture.colorSpace = THREE.SRGBColorSpace;
            const sweepGeometry = new THREE.PlaneGeometry(120, 520);
            const sweepMaterial = new THREE.MeshBasicMaterial({
                map: sweepTexture,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const sweepMesh = new THREE.Mesh(sweepGeometry, sweepMaterial);
            sweepMesh.position.z = 7;
            sweepMesh.rotation.z = -0.26;
            cardGroup.add(sweepMesh);
            disposeQueue.push(sweepTexture, sweepGeometry, sweepMaterial);

            scene.add(cardGroup);

            const AudioContextClass = window.AudioContext || (window as WindowWithLegacyAudioContext).webkitAudioContext;
            if (!AudioContextClass) {
                throw new Error('Audio recording is not supported in this browser.');
            }
            audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            const dest = audioCtx.createMediaStreamDestination();

            const masterGain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            const compressor = audioCtx.createDynamicsCompressor();
            filter.type = 'lowpass';
            filter.frequency.value = 1800;
            compressor.threshold.value = -24;
            compressor.knee.value = 18;
            compressor.ratio.value = 4;
            compressor.attack.value = 0.01;
            compressor.release.value = 0.18;

            masterGain.connect(filter);
            filter.connect(compressor);
            compressor.connect(dest);

            try {
                const audioRes = await fetch('/bgm-432hz.mp3');
                if (audioRes.ok) {
                    const audioData = await audioRes.arrayBuffer();
                    const audioBuffer = await audioCtx.decodeAudioData(audioData);
                    audioSource = audioCtx.createBufferSource();
                    audioSource.buffer = audioBuffer;
                    audioSource.loop = audioBuffer.duration < durationSec;
                    audioSource.connect(masterGain);
                }
            } catch (audioErr) {
                console.error('Error loading audio file:', audioErr);
            }

            sweepOsc = audioCtx.createOscillator();
            sweepOsc.type = 'sine';
            const sweepGain = audioCtx.createGain();
            sweepOsc.connect(sweepGain);
            sweepGain.connect(masterGain);

            sparkleOsc = audioCtx.createOscillator();
            sparkleOsc.type = 'triangle';
            const sparkleGain = audioCtx.createGain();
            sparkleOsc.connect(sparkleGain);
            sparkleGain.connect(masterGain);

            const renderVideoFrame = (elapsedMs: number, captureTrack?: CanvasCaptureMediaStreamTrack) => {
                const progress = Math.min(1, elapsedMs / VIDEO_DURATION_MS);
                const angle = progress * Math.PI * 2;
                const entrance = Math.min(1, progress / 0.16);
                const easedEntrance = 1 - Math.pow(1 - entrance, 3);

                cardGroup.rotation.y = Math.sin(angle) * 0.25;
                cardGroup.rotation.x = Math.sin(angle * 1.7) * 0.045 - 0.025;
                cardGroup.rotation.z = Math.sin(angle * 0.8) * 0.012;
                cardGroup.position.y = (1 - easedEntrance) * -28 + Math.sin(angle * 1.2) * 5;
                cardGroup.scale.setScalar(0.92 + easedEntrance * 0.08);

                sparkleLight.position.set(Math.sin(angle) * 360, Math.cos(angle * 1.4) * 185, 170);
                accentLight.position.set(Math.cos(angle * 0.85) * 360, Math.sin(angle * 1.1) * 210, 210);
                coolLight.position.set(Math.sin(angle * 1.35 + 1.2) * 420, Math.cos(angle * 0.7) * 220, 180);

                glowSprite.position.x = Math.cos(angle * 0.72) * 150;
                glowSprite.position.y = Math.sin(angle * 0.55) * 80;
                glowSprite.material.opacity = 0.22 + Math.sin(angle * 1.3) * 0.06;

                backgroundMesh.rotation.z = Math.sin(angle * 0.4) * 0.025;
                backgroundMesh.scale.setScalar(1.03 + Math.sin(angle * 0.65) * 0.02);

                const sweepProgress = Math.min(1, Math.max(0, (progress - 0.18) / 0.64));
                sweepMesh.position.x = -430 + sweepProgress * 860;
                sweepMaterial.opacity = Math.sin(Math.PI * sweepProgress) * 0.45;

                renderer.render(scene, camera);
                captureTrack?.requestFrame();
            };

            renderVideoFrame(0);

            const videoStream = renderer.domElement.captureStream(0);
            const captureTrack = videoStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
            combinedStream = new MediaStream([
                ...videoStream.getTracks(),
                ...dest.stream.getTracks()
            ]);

            const optionCandidates: MediaRecorderOptions[] = [
                { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 160000 },
                { mimeType: 'video/mp4;codecs=h264,aac', videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 160000 },
                { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 160000 },
                { mimeType: 'video/mp4', videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 160000 },
                { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 160000 },
                { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 160000 },
                { mimeType: 'video/webm', videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 160000 }
            ];
            const options = optionCandidates.find(candidate => MediaRecorder.isTypeSupported(candidate.mimeType ?? ''))
                ?? { videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 160000 };

            const mediaRecorder = new MediaRecorder(combinedStream, options);
            const chunks: Blob[] = [];

            const recordingDone = new Promise<Blob>((resolve, reject) => {
                mediaRecorder.ondataavailable = event => {
                    if (event.data.size > 0) chunks.push(event.data);
                };
                mediaRecorder.onerror = event => {
                    const recorderError = (event as ErrorEvent).error;
                    reject(recorderError ?? new Error('Failed to record video.'));
                };
                mediaRecorder.onstop = () => {
                    const type = mediaRecorder.mimeType || options.mimeType || 'video/webm';
                    const blob = new Blob(chunks, { type });
                    if (!blob.size) {
                        reject(new Error('No video data was produced.'));
                        return;
                    }
                    resolve(blob);
                };
            });

            mediaRecorder.start(250);

            const audioStartAt = audioCtx.currentTime + 0.04;
            masterGain.gain.setValueAtTime(0, audioStartAt);
            masterGain.gain.linearRampToValueAtTime(0.42, audioStartAt + 0.25);
            masterGain.gain.setValueAtTime(0.42, audioStartAt + durationSec - 0.45);
            masterGain.gain.linearRampToValueAtTime(0, audioStartAt + durationSec);

            if (audioSource) {
                audioSource.start(audioStartAt);
            }
            sweepOsc.frequency.setValueAtTime(220, audioStartAt);
            sweepOsc.frequency.exponentialRampToValueAtTime(760, audioStartAt + durationSec * 0.52);
            sweepOsc.frequency.exponentialRampToValueAtTime(260, audioStartAt + durationSec);
            sweepGain.gain.setValueAtTime(0, audioStartAt);
            sweepGain.gain.linearRampToValueAtTime(0.04, audioStartAt + durationSec * 0.4);
            sweepGain.gain.linearRampToValueAtTime(0, audioStartAt + durationSec);
            sweepOsc.start(audioStartAt);

            sparkleOsc.frequency.setValueAtTime(880, audioStartAt);
            sparkleOsc.frequency.exponentialRampToValueAtTime(1320, audioStartAt + 0.8);
            sparkleGain.gain.setValueAtTime(0, audioStartAt);
            sparkleGain.gain.linearRampToValueAtTime(0.018, audioStartAt + 0.18);
            sparkleGain.gain.linearRampToValueAtTime(0, audioStartAt + 1.05);
            sparkleOsc.start(audioStartAt);

            for (let frame = 0; frame <= Math.ceil(VIDEO_DURATION_MS / frameInterval); frame++) {
                const elapsed = Math.min(frame * frameInterval, VIDEO_DURATION_MS);
                renderVideoFrame(elapsed, captureTrack);

                const targetTime = performance.now() + frameInterval;
                await wait(Math.max(0, targetTime - performance.now()));
            }

            renderVideoFrame(VIDEO_DURATION_MS, captureTrack);
            await wait(180);

            if (mediaRecorder.state === 'recording') {
                mediaRecorder.requestData();
                await wait(60);
                mediaRecorder.stop();
            }

            return await recordingDone;
        } finally {
            cleanup();
        }
    };

    const handleDownloadVideo = async () => {
        if (!canvasRef.current || isRecording) return;
        setIsRecording(true);
        try {
            const blob = await generateVideoBlob();
            const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${user.username}-seismic-card.${extension}`;
            a.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error('Failed to create video:', err);
        } finally {
            setIsRecording(false);
        }
    };

    const handleMint = async () => {
        if (!canvasRef.current || isRecording || isMinting || !isConnected || !address) return;
        setIsMinting(true);
        setIsRecording(true);
        try {
            // 1. Network check
            if (chain?.id !== 5124) {
                throw new Error("Wrong network! Please switch to Seismic Testnet.");
            }

            // 2. Generate image blob from canvas
            setMintStatus('Generating Card Image...');
            const imageBlob = await new Promise<Blob>((resolve, reject) => {
                canvasRef.current!.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to create blob'));
                }, 'image/png');
            });

            // 3. Upload image to IPFS
            setMintStatus(`Uploading Image (${formatFileSize(imageBlob.size)})...`);
            const imageUri = await uploadFileToIPFS(imageBlob, `${user.username}-card.png`, {
                onUploadProgress: progress => {
                    setMintStatus(`Uploading Image ${progress.percent ?? 0}% (${formatFileSize(progress.loaded)} / ${formatFileSize(progress.total ?? imageBlob.size)})`);
                },
            });

            // 4. Generate video blob
            setMintStatus('Generating NFT Video...');
            const videoBlob = await generateVideoBlob();

            // 5. Upload video to IPFS
            setMintStatus(`Uploading Video (${formatFileSize(videoBlob.size)})...`);
            const extension = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
            const animationUrl = await uploadFileToIPFS(videoBlob, `${user.username}-card.${extension}`, {
                timeoutMs: VIDEO_UPLOAD_TIMEOUT_MS,
                onUploadProgress: progress => {
                    const percent = progress.percent ?? 0;
                    const uploaded = formatFileSize(progress.loaded);
                    const total = formatFileSize(progress.total ?? videoBlob.size);

                    setMintStatus(percent >= 100
                        ? `Pinning Video on IPFS (${total})...`
                        : `Uploading Video ${percent}% (${uploaded} / ${total})`
                    );
                },
            });

            // 6. Create and upload metadata
            setMintStatus('Uploading Metadata...');
            const mag = getMagnitude(user.roles);
            const metadataTemplate = {
                name: `Seismic Discord Stat - ${user.username}`,
                description: "Encrypted Shielded NFT representing a user's Discord statistics on Seismic Network",
                image: imageUri,
                animation_url: animationUrl,
            };
            const tokenURI = await uploadMetadataToIPFS(metadataTemplate);

            // 7. Call shielded mint contract (mints to msg.sender, auto-burns previous NFT if exists)
            setMintStatus('Confirm Mint in Wallet...');
            if (!walletClient) throw new Error('Wallet not connected');
            const hash = await shieldedWriteContract(walletClient, {
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: SEISMIC_DISCORD_STAT_ABI as unknown as Abi,
                functionName: "mint",
                chain: null,
                args: [
                    tokenURI,
                    BigInt(user.art || 0),
                    BigInt(user.tweet || 0),
                    BigInt((user.general_chat || 0) + (user.devnet_chat || 0) + (user.report_chat || 0)),
                    BigInt(Math.floor(mag || 0))
                ],
                gas: BigInt(5000000), // Hardcoded gas
            });
            setTxHash(hash);

            setMintStatus('Mint successful');
            setTimeout(() => setMintStatus(''), 5000);
        } catch (err: unknown) {
            const mintError = err as MintError;
            console.error('Failed to mint:', err);
            setMintStatus(`Mint failed: ${mintError.shortMessage || mintError.message || 'Mint Failed'}`);
            setTimeout(() => setMintStatus(''), 5000);
        } finally {
            setIsMinting(false);
            setIsRecording(false);
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <style>{`
                @keyframes card-tilt-preview {
                    0%, 100% { transform: none; }
                }
            `}</style>

            {/* Canvas Container */}
            <div style={{
                borderRadius: 4,
                border: '1px solid var(--seismic-hairline)',
                transformStyle: 'preserve-3d',
                animation: 'none',
                boxShadow: 'none',
                overflow: 'hidden',
            }}>
                <canvas
                    ref={canvasRef}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        borderRadius: 4,
                    }}
                />
            </div>

            {/* Buttons */}
            {ready && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginTop: 24,
                }}>
                    <button
                        onClick={handleDownloadImage}
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
                            // Jika sudah berhasil mint, share tweet khusus mint + tx hash
                            if (txHash) {
                                const explorerUrl = `https://seismic-testnet.socialscan.io/tx/${txHash}`;
                                const text = `Just minted my Shielded Seismic Discord Stat NFT on Seismic Testnet!\n\nTx Hash:\n${explorerUrl}\n\nMint Here : https://seismic.rizzgm.xyz\n\nDecrypt your NFT traits here: https://decrypt.rizzgm.xyz\n\n@SeismicSys #privacy #seismic #testnet`;
                                window.open(
                                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
                                    '_blank'
                                );
                                return;
                            }

                            // Default: share stats card saja
                            const percentText = rankInfo ? ((rankInfo.totalUsers - rankInfo.totalRank) / rankInfo.totalUsers * 100).toFixed(2) : '';
                            const topBadge = rankInfo && (rankInfo.totalRank / rankInfo.totalUsers) <= 0.01 ? 'Top 1% Elite' : user.total_messages > 1000 ? 'Diamond' : 'Member';

                            const text = `Just checked my Seismic stats!\n\nI'm in the ${percentText}% (Rank #${rankInfo?.totalRank}) with the ${topBadge} badge!\n\nCheck yours here: seismic.rizzgm.xyz\n\n@Seismic_X #SeismicCommunity`;
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
                            backgroundColor: 'var(--seismic-ink)',
                            borderColor: 'var(--seismic-ink)',
                            color: 'var(--seismic-canvas)'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Share on X
                    </button>

                    <button
                        onClick={handleDownloadVideo}
                        disabled={isRecording || isMinting}
                        className="btn btn-secondary"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            padding: '14px 10px',
                            fontSize: '0.8rem',
                            cursor: (isRecording || isMinting) ? 'wait' : 'pointer',
                            backgroundColor: (isRecording || isMinting) ? 'var(--seismic-card)' : '',
                            color: (isRecording || isMinting) ? 'var(--seismic-ash)' : ''
                        }}
                    >
                        {isRecording && !isMinting ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                        )}
                        {isRecording && !isMinting ? 'Rendering...' : 'Save as Video'}
                    </button>

                    {/* Mint NFT Section */}
                    <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--seismic-body)',
                            background: 'var(--seismic-soft)',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--seismic-hairline)',
                            textAlign: 'center',
                            marginBottom: '12px'
                        }}>
                            <strong>Caution:</strong> This is a playground project. Please use a <strong>burn wallet</strong> for your safety and privacy.
                        </div>

                        {!isConnected ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8,
                                padding: '16px',
                                background: 'var(--seismic-canvas)',
                                borderRadius: 4,
                                border: '1px solid var(--seismic-hairline)',
                            }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--seismic-ink)', fontWeight: 600, marginBottom: 4 }}>
                                    Connect Wallet to Mint as NFT
                                </div>
                                <SeismicConnectButton />
                            </div>
                        ) : (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}>
                                <button
                                    onClick={handleMint}
                                    disabled={isMinting}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 10,
                                        padding: '14px 20px',
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        cursor: isMinting ? 'wait' : 'pointer',
                                        width: '100%',
                                        border: '1px solid var(--seismic-ink)',
                                        borderRadius: 4,
                                        color: isMinting ? 'var(--seismic-ash)' : 'var(--seismic-canvas)',
                                        background: isMinting ? 'var(--seismic-card)' : 'var(--seismic-ink)',
                                        boxShadow: 'none',
                                        transition: 'background-color 0.15s ease, color 0.15s ease',
                                        opacity: (isMinting) ? 0.7 : 1,
                                    }}
                                >
                                    {isMinting ? (
                                        <>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                            </svg>
                                            <span style={{ color: 'var(--seismic-ash)' }}>{mintStatus || 'Minting...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                                <path d="M2 17l10 5 10-5" />
                                                <path d="M2 12l10 5 10-5" />
                                            </svg>
                                            Mint Shielded NFT Daily
                                        </>
                                    )}
                                </button>
                                {mintStatus && !isMinting && (
                                    <div style={{
                                        textAlign: 'center',
                                        fontSize: '0.8rem',
                                        padding: '8px 12px',
                                        borderRadius: 4,
                                        background: 'var(--seismic-soft)',
                                        color: mintStatus.startsWith('Mint successful') ? 'var(--seismic-plum-deep)' : 'var(--seismic-ink)',
                                        border: `1px solid ${mintStatus.startsWith('Mint successful') ? 'var(--seismic-plum)' : 'var(--seismic-hairline)'}`,
                                    }}>
                                        {mintStatus}
                                    </div>
                                )}
                                {txHash && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                        marginTop: 8,
                                    }}>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--seismic-body)',
                                            textAlign: 'center',
                                            wordBreak: 'break-all',
                                            background: 'var(--seismic-soft)',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--seismic-hairline)',
                                        }}>
                                            <div style={{ marginBottom: 4 }}>Transaction Hash:</div>
                                            <a
                                                href={`https://seismic-testnet.socialscan.io/tx/${txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--seismic-ink)', textDecoration: 'underline' }}
                                            >
                                                {String(txHash)}
                                            </a>
                                        </div>
                                        <div style={{
                                            fontSize: '0.85rem',
                                            color: 'var(--seismic-body)',
                                            textAlign: 'center',
                                            background: 'var(--seismic-soft)',
                                            padding: '12px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--seismic-hairline)',
                                        }}>
                                            ✨ <strong>Mint Successful!</strong>
                                            <br />
                                            You can view and decrypt your encrypted NFT traits at:<br />
                                            <a
                                                href="https://decrypt.rizzgm.xyz"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--seismic-ink)', textDecoration: 'underline', fontWeight: 'bold', display: 'inline-block', marginTop: 4 }}
                                            >
                                                decrypt.rizzgm.xyz
                                            </a>

                                            <div style={{ marginTop: '16px' }}>
                                                <a
                                                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just minted my Shielded NFT Daily on the @SeismicSystems Community Dashboard!\n\nView my transaction here: https://seismic-testnet.socialscan.io/tx/${txHash}\nIf you've been active in the discord, claim yours now at`)}&url=${encodeURIComponent('https://rizzgm.xyz')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        background: 'var(--seismic-ink)',
                                                        color: 'var(--seismic-canvas)',
                                                        padding: '8px 16px',
                                                        borderRadius: '4px',
                                                        textDecoration: 'none',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        border: '1px solid var(--seismic-ink)',
                                                        transition: 'background-color 0.15s ease',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'var(--seismic-ink-deep)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'var(--seismic-ink)';
                                                    }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                    </svg>
                                                    Share Mint on X
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div style={{ textAlign: 'center', marginTop: 8 }}>
                                    <SeismicConnectButton />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
