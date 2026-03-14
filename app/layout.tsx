import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from '@/components/client-providers';
import { LemonSqueezyLoader } from '@/components/lemonsqueezy-loader';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'HURRIAN - Yapay Zekâ Müzik Üretici',
  description: 'Tarihteki ilk şarkıdan sonsuz yapay zekâ müziğine.',
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'HURRIAN - AI Music Generator',
    description: 'From the first song in history to infinite AI music.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" />
      </head>
      <body className="min-h-screen antialiased">
        <ClientProviders>{children}</ClientProviders>
        <LemonSqueezyLoader />
      </body>
    </html>
  );
}
