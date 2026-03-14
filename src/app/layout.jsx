import "./globals.css";
import { DM_Sans, Outfit, JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── CRITICAL FIX: Load wallet provider ONLY on client (no more indexedDB crash) ──
const ClientProviders = dynamic(
  () => import("@/components/ClientProviders"),
  { ssr: false }
);

// ── Other heavy client-only components ──
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

// This is still a SERVER COMPONENT
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