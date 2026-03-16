import "./globals.css";
import { DM_Sans, Outfit, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";

// ── next/font: self-hosted, no render-blocking ──
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "Aurora NFT — Discover & Mint Digital Art",
  description:
    "Explore thousands of unique NFTs from creators worldwide. Mint, collect, and trade on Base L2.",
  icons: { icon: "/pictures/logo.png" },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="grain bg-bg text-text antialiased font-body min-h-screen flex flex-col">
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}