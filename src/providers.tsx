"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ShieldedWalletProvider } from "seismic-react";
import { seismicTestnet } from "seismic-react/rainbowkit";

const config = getDefaultConfig({
    appName: "Seismic Community Dashboard",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "5f8fbc2e79eabdc4627b00fb86a8bfb5", // Recommended to change this to your Cloud WalletConnect ID
    chains: [seismicTestnet],
    ssr: true,
});

const client = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={client}>
                <RainbowKitProvider theme={darkTheme()}>
                    {/* @ts-ignore */}
                    <ShieldedWalletProvider config={config}>
                        {children}
                    </ShieldedWalletProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
