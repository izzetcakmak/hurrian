import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HistoryClient } from './history-client';

export default function HistoryPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HistoryClient />
      <Footer />
    </main>
  );
}
