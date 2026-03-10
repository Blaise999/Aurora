import "./globals.css";
import { DM_Sans, Outfit, JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClientProviders from "@/components/ClientProviders";

// ── next/font: self-hosted, no render-blocking <link> or @import ──
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

// ── Lazy-load heavy components that aren't needed at first paint ──
const ToastProvider = dynamic(() => import("@/components/ToastProvider"), {
  ssr: false,
});
const SupportChatWidget = dynamic(
  () => import("@/components/support/SupportChatWidget"),
  { ssr: false }
);
const VisitorTrackerProvider = dynamic(
  () => import("@/components/support/VisitorTrackerProvider"),
  { ssr: false }
);

export const metadata = {
  title: "Aurora NFT — Discover & Mint Digital Art",
  description:
    "Explore thousands of unique NFTs from creators worldwide. Mint, collect, and trade on Base L2.",
  icons: { icon: "/logo.png" },
};

// This is a SERVER COMPONENT — no "use client" here.
// Only ClientProviders (wagmi/wallet context) is client-side.
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="grain bg-bg text-text antialiased font-body min-h-screen flex flex-col">
        <ClientProviders>
          <Navbar />
          <main className="flex-1 pt-16 sm:pt-20">{children}</main>
          <Footer />
          <ToastProvider />
          <SupportChatWidget />
          <VisitorTrackerProvider />
        </ClientProviders>
      </body>
    </html>
  );
}
