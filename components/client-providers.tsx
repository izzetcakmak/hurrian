'use client';

import { ReactNode, useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from '@/lib/language-context';
import { WalletProvider } from '@/lib/wallet-context';

export function ClientProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <SessionProvider>
      <LanguageProvider>
        <WalletProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
              },
            }}
          />
          {children}
        </WalletProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
