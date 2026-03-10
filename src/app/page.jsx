import dynamic from "next/dynamic";
import PageShell from "@/components/layout/PageShell";
import HeroCarousel from "@/components/hero/HeroCarousel";

// ── Above-the-fold: loaded eagerly ──
import LiveStats from "@/components/home/LiveStats";
import BreakingNewsTicker from "@/components/home/BreakingNewsTicker";

// ── Below-the-fold: lazy-loaded to reduce initial JS bundle ──
const TrendingNftBar = dynamic(
  () => import("@/components/nft/TrendingNftBar"),
  { ssr: true }
);
const FeaturedNFTs = dynamic(
  () => import("@/components/home/FeaturedNFTs"),
  { ssr: true }
);
const TrendingCollections = dynamic(
  () => import("@/components/home/TrendingCollections"),
  { ssr: true }
);
const HowItWorks = dynamic(
  () => import("@/components/home/HowItWorks"),
  { ssr: true }
);
const MarketPulse = dynamic(
  () => import("@/components/home/MarketPulse"),
  { ssr: true }
);
const CallToAction = dynamic(
  () => import("@/components/home/CallToAction"),
  { ssr: true }
);
const Roadmap = dynamic(
  () => import("@/components/home/Roadmap"),
  { ssr: true }
);
const FAQ = dynamic(
  () => import("@/components/home/FAQ"),
  { ssr: false } // FAQ is interactive + far below fold
);

export default function Home() {
  return (
    <PageShell heroFused>
      <HeroCarousel />
      <LiveStats />
      <BreakingNewsTicker />
      <TrendingNftBar />
      <FeaturedNFTs />
      <TrendingCollections />
      <HowItWorks />
      <MarketPulse />
      <CallToAction />
      <Roadmap />
      <FAQ />
    </PageShell>
  );
}
