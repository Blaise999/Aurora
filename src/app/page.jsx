import dynamic from "next/dynamic";
import HeroCarousel from "@/components/hero/HeroCarousel";

// ── Above-the-fold: loaded eagerly ──
import LiveStats from "@/components/home/LiveStats";
import BreakingNewsTicker from "@/components/home/BreakingNewsTicker";

// ── Below-the-fold: lazy-loaded to reduce initial JS bundle ──
const TrendingNftBar = dynamic(() => import("@/components/nft/TrendingNftBar"), { ssr: true });
const FeaturedNFTs = dynamic(() => import("@/components/home/FeaturedNFTs"), { ssr: true });
const RecentActivity = dynamic(() => import("@/components/home/RecentActivity"), { ssr: false });
const TrendingCollections = dynamic(() => import("@/components/home/TrendingCollections"), { ssr: true });
const LiveDrops = dynamic(() => import("@/components/home/LiveDrops"), { ssr: true });
const CommunityNumbers = dynamic(() => import("@/components/home/CommunityNumbers"), { ssr: false });
const WhyCollect = dynamic(() => import("@/components/home/WhyCollect"), { ssr: true });
const PoweredBy = dynamic(() => import("@/components/home/PoweredBy"), { ssr: true });
const TrustRow = dynamic(() => import("@/components/home/TrustRow"), { ssr: true });
const HowItWorks = dynamic(() => import("@/components/home/HowItWorks"), { ssr: true });
const ChainEcosystem = dynamic(() => import("@/components/home/ChainEcosystem"), { ssr: true });
const Web3Culture = dynamic(() => import("@/components/home/Web3Culture"), { ssr: false });
const TopCollectors = dynamic(() => import("@/components/home/TopCollectors"), { ssr: false });
const MarketPulse = dynamic(() => import("@/components/home/MarketPulse"), { ssr: true });
const Newsletter = dynamic(() => import("@/components/home/Newsletter"), { ssr: false });
const CallToAction = dynamic(() => import("@/components/home/CallToAction"), { ssr: true });
const Roadmap = dynamic(() => import("@/components/home/Roadmap"), { ssr: true });
const FAQ = dynamic(() => import("@/components/home/FAQ"), { ssr: false });

export default function Home() {
  return (
    <>
      {/* ── HERO ── */}
      <HeroCarousel />
      <LiveStats />
      <BreakingNewsTicker />

      {/* ── DISCOVERY ── */}
      <TrendingNftBar />
      <FeaturedNFTs />
      <RecentActivity />
      <TrendingCollections />
      <LiveDrops />

      {/* ── SOCIAL PROOF ── */}
      <CommunityNumbers />
      <PoweredBy />

      {/* ── EDUCATION ── */}
      <WhyCollect />
      <TrustRow />
      <HowItWorks />
      <ChainEcosystem />

      {/* ── COMMUNITY ── */}
      <Web3Culture />
      <TopCollectors />
      <MarketPulse />

      {/* ── CONVERSION ── */}
      <Newsletter />
      <CallToAction />

      {/* ── INFO ── */}
      <Roadmap />
      <FAQ />
    </>
  );
}