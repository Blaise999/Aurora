import "./globals.css";
import { DM_Sans, Outfit, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import AppShell from "@/components/layout/PageShell";

// ── Fonts ──
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

// ── SEO metadata ──
const SITE_URL = "https://www.auroranft.art";
const SITE_NAME = "Aurora NFT";
const TITLE = "Aurora NFT — Discover, Mint & Collect Digital Art on Base";
const DESCRIPTION =
  "The premium NFT marketplace on Base. Explore thousands of unique digital collectibles, mint your own ERC-721 NFTs on-chain, and build your collection with low fees and instant finality.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Aurora NFT",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "NFT", "NFT marketplace", "Base NFT", "mint NFT", "digital art",
    "ERC-721", "crypto collectibles", "Base chain", "Web3", "Aurora NFT",
    "NFT platform", "on-chain art", "low fee NFT",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

  // Canonical
  alternates: {
    canonical: SITE_URL,
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Aurora NFT — Discover, Mint & Collect Digital Art",
        type: "image/png",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/twitter-image.png"],
    creator: "@AuroraNFT",
  },

  // Icons — Next.js auto-discovers from app/icon.png, app/favicon.ico, app/apple-icon.png
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "icon", url: "/icon-192.png", sizes: "192x192" },
      { rel: "icon", url: "/icon-512.png", sizes: "512x512" },
    ],
  },

  // Misc
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: "your-verification-code",
  },
};

export const viewport = {
  themeColor: "#070A19",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="canonical" href={SITE_URL} />
      </head>
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
