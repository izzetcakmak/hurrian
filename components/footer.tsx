'use client';

import { useLanguage } from '@/lib/language-context';
import { Music } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="max-w-[1200px] mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-red-500 flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-slate-500">{t('footerText')}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 inline-block" />
            {t('poweredByArc')}
          </span>
          <span className="text-slate-700">|</span>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            {t('home')}
          </Link>
          <Link href="/history" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            {t('history')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
