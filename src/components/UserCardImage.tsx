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
import { formatEther } from 'viem';

const CONTRACT_ADDRESS = "0x143BF3D6F430C1C993E296A424a551EB29B6E4a5";

// Custom Seismic Connect Button that handles balance display gracefully
function SeismicConnectButton() {
    const { address, isConnected, chain } = useAccount();
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
                                            color: '#fff',
                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            border: 'none',
                                            borderRadius: 12,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        🔗 Connect Wallet
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
                                            color: '#fff',
                                            background: '#ef4444',
                                            border: 'none',
                                            borderRadius: 12,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        ⚠️ Wrong Network
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
                                            color: '#d1d5db',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 10,
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
                                            color: '#d1d5db',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 10,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {formattedBalance} ETH
                                        <span style={{ color: '#9ca3af' }}>|</span>
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

    const generateVideoBlob = (): Promise<Blob> => {
        return new Promise(async (resolve, reject) => {
            if (!canvasRef.current) return reject(new Error('No canvas'));
            try {
                const THREE = await import('three');

                const vw = 600;
                const vh = 380;

                const scene = new THREE.Scene();
                scene.background = new THREE.Color('#080808');

                const camera = new THREE.PerspectiveCamera(45, vw / vh, 0.1, 1000);
                camera.position.z = 520;

                const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
                renderer.setPixelRatio(DPR);
                renderer.setSize(vw, vh);

                const texture = new THREE.CanvasTexture(canvasRef.current);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                texture.minFilter = THREE.LinearFilter;

                const radius = 20;
                const roundedRectShape = new THREE.Shape();
                const x = -vw / 2;
                const y = -vh / 2;

                roundedRectShape.moveTo(x, y + radius);
                roundedRectShape.lineTo(x, y + vh - radius);
                roundedRectShape.quadraticCurveTo(x, y + vh, x + radius, y + vh);
                roundedRectShape.lineTo(x + vw - radius, y + vh);
                roundedRectShape.quadraticCurveTo(x + vw, y + vh, x + vw, y + vh - radius);
                roundedRectShape.lineTo(x + vw, y + radius);
                roundedRectShape.quadraticCurveTo(x + vw, y, x + vw - radius, y);
                roundedRectShape.lineTo(x + radius, y);
                roundedRectShape.quadraticCurveTo(x, y, x, y + radius);

                const extrusionSettings = {
                    depth: 6,
                    bevelEnabled: true,
                    bevelSegments: 2,
                    steps: 1,
                    bevelSize: 0.5,
                    bevelThickness: 0.5
                };

                const geometry = new THREE.ExtrudeGeometry(roundedRectShape, extrusionSettings);

                const position = geometry.attributes.position;
                const uv = geometry.attributes.uv;
                for (let i = 0; i < uv.count; i++) {
                    const px = position.getX(i);
                    const py = position.getY(i);
                    const u = (px + vw / 2) / vw;
                    const v = (py + vh / 2) / vh;
                    uv.setXY(i, u, v);
                }

                geometry.translate(0, 0, -3);

                const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
                scene.add(ambientLight);

                const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
                dirLight1.position.set(-100, 100, 200);
                scene.add(dirLight1);

                const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
                dirLight2.position.set(100, -50, 200);
                scene.add(dirLight2);

                const lightRefRef1 = new THREE.PointLight(0xffffff, 2.0, 1000);
                const lightRefRef2 = new THREE.PointLight(0xffffff, 1.5, 1000);
                const lightRefRef3 = new THREE.PointLight(0xffffff, 1.0, 1000);

                lightRefRef1.position.set(0, 0, 100);
                lightRefRef2.position.set(0, 0, 150);
                lightRefRef3.position.set(0, 0, 120);

                scene.add(lightRefRef1);
                scene.add(lightRefRef2);
                scene.add(lightRefRef3);

                const darkMat = new THREE.MeshStandardMaterial({
                    color: 0x111111,
                    roughness: 0.7,
                    metalness: 0.3
                });
                const frontMat = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: 0.1,
                    metalness: 0.4,
                });

                const materials = [frontMat, darkMat];
                const mesh = new THREE.Mesh(geometry, materials);
                scene.add(mesh);

                // ---- Audio Generation ----
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioCtx = new AudioContextClass();
                const dest = audioCtx.createMediaStreamDestination();

                const masterGain = audioCtx.createGain();
                masterGain.gain.value = 0.5;

                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 1500;
                filter.connect(dest);
                masterGain.connect(filter);

                let audioSource: AudioBufferSourceNode | null = null;

                try {
                    const audioRes = await fetch('/bgm-432hz.mp3');
                    if (audioRes.ok) {
                        const audioData = await audioRes.arrayBuffer();
                        const audioBuffer = await audioCtx.decodeAudioData(audioData);
                        audioSource = audioCtx.createBufferSource();
                        audioSource.buffer = audioBuffer;
                        audioSource.connect(masterGain);
                        audioSource.start();
                    } else {
                        console.warn('Could not load BGM file.');
                    }
                } catch (audioErr) {
                    console.error('Error loading audio file:', audioErr);
                }

                const sweepOsc = audioCtx.createOscillator();
                sweepOsc.type = 'sine';
                sweepOsc.frequency.setValueAtTime(250, audioCtx.currentTime);
                sweepOsc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 5);
                sweepOsc.frequency.exponentialRampToValueAtTime(250, audioCtx.currentTime + 10);

                const sweepGain = audioCtx.createGain();
                sweepGain.gain.setValueAtTime(0, audioCtx.currentTime);
                sweepGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 5);
                sweepGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 10);

                sweepOsc.connect(sweepGain);
                sweepGain.connect(masterGain);
                sweepOsc.start();

                // ---- Record Video & Audio ----
                const videoStream = renderer.domElement.captureStream(30);
                const combinedStream = new MediaStream([
                    ...videoStream.getTracks(),
                    ...dest.stream.getTracks()
                ]);

                let options: any = { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', videoBitsPerSecond: 8000000 };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/mp4', videoBitsPerSecond: 8000000 };
                }
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 8000000 };
                }
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/webm', videoBitsPerSecond: 8000000 };
                }

                const mediaRecorder = new MediaRecorder(combinedStream, options);
                const chunks: Blob[] = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const isMp4 = mediaRecorder.mimeType.includes('mp4');
                    const blobType = isMp4 ? 'video/mp4' : 'video/webm';
                    const blob = new Blob(chunks, { type: blobType });

                    // Cleanup
                    if (audioSource) {
                        audioSource.stop();
                        audioSource.disconnect();
                    }
                    sweepOsc.stop();
                    audioCtx.close();
                    renderer.dispose();
                    geometry.dispose();
                    frontMat.dispose();
                    darkMat.dispose();
                    texture.dispose();

                    resolve(blob);
                };

                mediaRecorder.start();

                // Render loop: 10 seconds @ 30fps
                const totalFrames = 300;
                let frame = 0;

                const renderLoop = () => {
                    if (frame > totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }
                    const progress = frame / totalFrames;
                    const angle = progress * Math.PI * 2;

                    mesh.rotation.y = Math.sin(angle) * 0.3;
                    mesh.rotation.x = Math.sin(angle * 2) * 0.05;

                    lightRefRef1.position.x = Math.sin(angle) * 400;
                    lightRefRef1.position.y = Math.cos(angle * 1.5) * 200;
                    lightRefRef2.position.x = Math.cos(angle * 1.2) * 350;
                    lightRefRef2.position.y = Math.sin(angle * 0.8) * 250;
                    lightRefRef3.position.x = Math.sin(angle * 0.5) * 450;
                    lightRefRef3.position.y = Math.sin(angle * 2) * -150;

                    renderer.render(scene, camera);
                    frame++;
                    requestAnimationFrame(renderLoop);
                };

                renderLoop();

            } catch (err) {
                reject(err);
            }
        });
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
            setMintStatus('Uploading Image to IPFS...');
            const imageUri = await uploadFileToIPFS(imageBlob, `${user.username}-card.png`);

            // 4. Generate video blob
            setMintStatus('Generating NFT Video (10s)...');
            const videoBlob = await generateVideoBlob();

            // 5. Upload video to IPFS
            setMintStatus('Uploading Video to IPFS...');
            const extension = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
            const animationUrl = await uploadFileToIPFS(videoBlob, `${user.username}-card.${extension}`);

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
                abi: SEISMIC_DISCORD_STAT_ABI as any,
                functionName: "mint",
                args: [
                    tokenURI,
                    BigInt(user.art || 0),
                    BigInt(user.tweet || 0),
                    BigInt((user.general_chat || 0) + (user.devnet_chat || 0) + (user.report_chat || 0)),
                    BigInt(Math.floor(mag || 0))
                ],
                gas: BigInt(5000000), // Hardcoded gas
            } as any);
            setTxHash(hash);

            setMintStatus('✅ Mint Successful!');
            setTimeout(() => setMintStatus(''), 5000);
        } catch (err: any) {
            console.error('Failed to mint:', err);
            setMintStatus(`❌ ${err?.shortMessage || err?.message || 'Mint Failed'}`);
            setTimeout(() => setMintStatus(''), 5000);
        } finally {
            setIsMinting(false);
            setIsRecording(false);
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', perspective: 1200 }}>
            <style>{`
                @keyframes card-tilt-preview {
                    0% { transform: rotateY(-8deg) rotateX(2deg); }
                    100% { transform: rotateY(8deg) rotateX(-2deg); }
                }
            `}</style>

            {/* Canvas Container */}
            <div style={{
                borderRadius: 16,
                transformStyle: 'preserve-3d',
                animation: 'card-tilt-preview 3s ease-in-out infinite alternate',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 20px rgba(166, 146, 77, 0.1)',
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
                                const text = `Just minted my Shielded Seismic Discord Stat NFT on Seismic Testnet! 🚀\n\nTx Hash:\n${explorerUrl}\n\nMint Here : https://seismic.rizzgm.xyz\n\nDecrypt your NFT traits here: https://decrypt.rizzgm.xyz\n\n@SeismicSys #privacy #seismic #testnet`;
                                window.open(
                                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
                                    '_blank'
                                );
                                return;
                            }

                            // Default: share stats card saja
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
                            backgroundColor: (isRecording || isMinting) ? '#1a1a1a' : '',
                            color: (isRecording || isMinting) ? '#888' : ''
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
                            color: '#fbbf24',
                            background: 'rgba(251, 191, 36, 0.1)',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(251, 191, 36, 0.2)',
                            textAlign: 'center',
                            marginBottom: '12px'
                        }}>
                            ⚠️ <strong>Caution:</strong> This is a playground project. Please use a <strong>burn wallet</strong> for your safety and privacy.
                        </div>

                        {!isConnected ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8,
                                padding: '16px',
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                                borderRadius: 12,
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                            }}>
                                <div style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600, marginBottom: 4 }}>
                                    🔗 Connect Wallet to Mint as NFT
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
                                        border: 'none',
                                        borderRadius: 12,
                                        color: '#161616', // Dark text on light background
                                        background: (isMinting)
                                            ? 'linear-gradient(135deg, #374151, #1f2937)'
                                            : 'linear-gradient(135deg, #D4BB6E, #E3CE8C)', // Gold theme
                                        boxShadow: (isMinting)
                                            ? 'none'
                                            : '0 4px 20px rgba(212, 187, 110, 0.4)',
                                        transition: 'all 0.3s ease',
                                        opacity: (isMinting) ? 0.7 : 1,
                                    }}
                                >
                                    {isMinting ? (
                                        <>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                            </svg>
                                            <span style={{ color: '#fff' }}>{mintStatus || 'Minting...'}</span>
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
                                        borderRadius: 8,
                                        background: mintStatus.includes('✅') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: mintStatus.includes('✅') ? '#22c55e' : '#ef4444',
                                        border: `1px solid ${mintStatus.includes('✅') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
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
                                            color: '#9ca3af',
                                            textAlign: 'center',
                                            wordBreak: 'break-all',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            padding: '10px',
                                            borderRadius: '8px',
                                        }}>
                                            <div style={{ marginBottom: 4 }}>Transaction Hash:</div>
                                            <a
                                                href={`https://seismic-testnet.socialscan.io/tx/${txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#D4BB6E', textDecoration: 'underline' }}
                                            >
                                                {String(txHash)}
                                            </a>
                                        </div>
                                        <div style={{
                                            fontSize: '0.85rem',
                                            color: '#d1d5db',
                                            textAlign: 'center',
                                            background: 'rgba(212, 187, 110, 0.1)',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(212, 187, 110, 0.2)',
                                        }}>
                                            ✨ <strong>Mint Successful!</strong>
                                            <br />
                                            You can view and decrypt your encrypted NFT traits at:<br />
                                            <a
                                                href="https://decrypt.rizzgm.xyz"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#E3CE8C', textDecoration: 'underline', fontWeight: 'bold', display: 'inline-block', marginTop: 4 }}
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
                                                        background: '#000',
                                                        color: '#fff',
                                                        padding: '8px 16px',
                                                        borderRadius: '24px',
                                                        textDecoration: 'none',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        border: '1px solid #333',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#111';
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = '#000';
                                                        e.currentTarget.style.transform = 'translateY(0)';
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
