import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Providers } from "@/providers";

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
      <head>
        <script defer
          data-site-id="seismic.rizzgm.xyz"
          src="https://datrica.live/analytics.js">
        </script>
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <Navbar />
          <main style={{ minHeight: 'calc(100vh - 56px)' }}>
            {children}
          </main>
          <footer style={{
            borderTop: '1px solid var(--seismic-hairline)',
            padding: '40px 0',
            marginTop: 88,
            background: 'var(--seismic-dark)',
            color: 'var(--seismic-on-dark-muted)',
          }}>
            <div className="container" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--seismic-on-dark-muted)' }}>
                Seismic Community Dashboard
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--seismic-on-dark-muted)' }}>
                Built with live Discord contribution data
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}


