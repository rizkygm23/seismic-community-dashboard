import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Seismic Community Dashboard",
  description: "Explore community contributions, leaderboards, and statistics for the Seismic Discord server",
  keywords: ["Seismic", "Discord", "Community", "Dashboard", "Leaderboard"],
  authors: [{ name: "Seismic Community" }],
  icons: {
    icon: '/logo/logoseismic.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </main>
        <footer style={{
          borderTop: '1px solid var(--seismic-gray-800)',
          padding: '24px 0',
          marginTop: 48,
        }}>
          <div className="container text-center">
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              Seismic Community Dashboard • Built with data from Discord
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
