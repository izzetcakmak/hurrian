import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { AdBanner } from '@/components/ad-banner';
import { DemoPlayer } from '@/components/demo-player';
import { MusicGenerator } from '@/components/music-generator';
import { RecentSongs } from '@/components/recent-songs';
import { Footer } from '@/components/footer';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <div className="px-4">
        <AdBanner />
        <DemoPlayer />
      </div>
      <div className="px-4 pb-16">
        <MusicGenerator />
      </div>
      <RecentSongs />
      <Footer />
    </main>
  );
}
