import PageShell from '@/components/layout/PageShell';
import HeroCarousel from '@/components/hero/HeroCarousel';
import BreakingNewsTicker from '@/components/home/BreakingNewsTicker';
import TrendingNftBar from '@/components/nft/TrendingNftBar';
import FeaturedNFTs from '@/components/home/FeaturedNFTs';
import TrendingCollections from '@/components/home/TrendingCollections';
import HowItWorks from '@/components/home/HowItWorks';
import MarketPulse from '@/components/home/MarketPulse';
import Roadmap from '@/components/home/Roadmap';
import FAQ from '@/components/home/FAQ';
import LiveStats from '@/components/home/LiveStats';
import CallToAction from '@/components/home/CallToAction';

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
