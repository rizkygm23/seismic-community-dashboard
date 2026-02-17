"use client";
import { cn } from "@/lib/utils";
import React from "react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import {
    Trophy,
    BarChart3,
    Globe2,
    Compass,
    TrendingUp,
    ArrowUpRight,
    Users,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";

export interface HomeBentoData {
    leaderboard: {
        username: string;
        avatar_url: string | null;
        score: number;
    }[];
    stats: {
        totalContributions: number;
    };
    global: {
        totalRegions: number;
    };
}

export function HomeBentoGrid({ data }: { data: HomeBentoData }) {
    return (
        <BentoGrid className="w-full max-w-full mx-auto md:auto-rows-[20rem]">
            {items(data).map((item, i) => (
                <WrappedBentoGridItem key={i} item={item} />
            ))}
        </BentoGrid>
    );
}

const WrappedBentoGridItem = ({ item }: { item: any }) => {
    return (
        <Link
            href={item.href}
            className={cn(
                "block h-full w-full relative",
                item.className
            )}
        >
            <BentoGridItem
                title={
                    <div className="flex items-center gap-2">
                        {item.icon}
                        <span className="text-base font-semibold">{item.title}</span>
                    </div>
                }
                description={item.description}
                header={item.header}
                className={cn(
                    "[&>p:text-lg]",
                    "h-full shadow-none hover:shadow-none",
                    "cursor-pointer border border-transparent transition-all duration-300 bg-neutral-900/40 backdrop-blur-sm"
                )}
                icon={<ArrowUpRight className="h-4 w-4 text-neutral-500 absolute top-4 right-4 opacity-0 group-hover/bento:opacity-100 transition-opacity" />}
            />
        </Link>
    );
};

// --- Custom Visuals ---



// 2. Statistics: Total Contributions
const StatisticsVisual = ({ data }: { data: HomeBentoData['stats'] }) => {
    return (
        <div className="flex flex-1 w-full h-full min-h-[6rem] bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-800 rounded-lg p-6 flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-dot-white/[0.1] opacity-50" />
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative z-10 text-center"
            >
                <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-500">
                    {data.totalContributions >= 1000 ? (data.totalContributions / 1000).toFixed(1) + 'k' : data.totalContributions}
                </div>
                <div className="text-sm text-neutral-500 mt-2 font-medium uppercase tracking-widest">Total Contributions</div>
            </motion.div>
        </div>
    );
};

// 3. Global: Total Regions
const GlobalVisual = ({ data }: { data: HomeBentoData['global'] }) => {
    return (
        <div className="flex flex-1 w-full h-full min-h-[6rem] bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-800 rounded-lg p-6 flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-dot-white/[0.1] opacity-50" />

            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative z-10 flex flex-col items-center gap-2 text-center"
            >
                <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-500">
                    {data.totalRegions}
                </div>
                <div className="text-sm text-neutral-500 mt-2 font-medium uppercase tracking-widest">Regions Connected</div>
            </motion.div>
        </div>
    );
};



// 1. Leaderboard: Top 10 Users
const LeaderboardVisual = ({ data }: { data: HomeBentoData['leaderboard'] }) => {
    const tooltipItems = data.map((user, i) => ({
        id: i + 1,
        name: user.username,
        designation: `${user.score.toLocaleString()} Contributions`,
        image: user.avatar_url || "/avatar-placeholder.png",
    }));

    return (
        <div className="flex flex-1 w-full h-full min-h-[6rem] bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-900/50 pointer-events-none z-10" />
            {/* Mobile View: Show only top 3 */}
            <div className="flex md:hidden flex-row items-center justify-center w-full">
                <AnimatedTooltip items={tooltipItems.slice(0, 3)} />
            </div>

            {/* Desktop View: Show all */}
            <div className="hidden md:flex flex-row items-center justify-center w-full">
                <AnimatedTooltip items={tooltipItems} />
            </div>
        </div>
    );
};

// 5. Promotion: Top 3 Users Highlights - REMOVED
// 4. Explore: Role Holders - REMOVED

// Layout: 
// Row 1: Statistic (1) | Global (1) | Promotion (1)
// Row 2: Leaderboard (2) | Explore (1)
const items = (data: HomeBentoData) => [
    {
        title: "Total Contributions",
        description: "",
        header: <StatisticsVisual data={data.stats} />,
        className: "md:col-span-1",
        icon: <BarChart3 className="h-4 w-4 text-neutral-500" />,
        href: "/stats",
    },
    {
        title: "Data Coverage",
        description: "",
        header: <GlobalVisual data={data.global} />,
        className: "md:col-span-2",
        icon: <Globe2 className="h-4 w-4 text-neutral-500" />,
        href: "/global",
    },
    {
        title: "Top 10 Contributors",
        description: "Leading members ranked by Art + Tweets",
        header: <LeaderboardVisual data={data.leaderboard} />,
        className: "md:col-span-3",
        icon: <Trophy className="h-4 w-4 text-neutral-500" />,
        href: "/leaderboard",
    },
];
