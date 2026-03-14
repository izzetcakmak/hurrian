'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { useWallet } from '@/lib/wallet-context';
import { Music, History, Globe, Wallet, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export function Header() {
  const { locale, setLocale, t } = useLanguage();
  const { address, balance, isConnected, isConnecting, connectWallet, disconnectWallet } = useWallet();

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/5"
    >
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-red-500 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-shadow">
            <Music className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
            HURRIAN
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <Music className="w-4 h-4" />
            <span className="hidden sm:inline">{t('home')}</span>
          </Link>
          <Link
            href="/history"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{t('history')}</span>
          </Link>
          <button
            onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <Globe className="w-4 h-4" />
            {locale === 'tr' ? 'EN' : 'TR'}
          </button>

          {/* Wallet Connect */}
          {isConnected ? (
            <div className="flex items-center gap-1.5 ml-1">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{shortAddr}</span>
                <span className="text-emerald-300 font-semibold">{parseFloat(balance).toFixed(4)} ETH</span>
              </div>
              <button
                onClick={disconnectWallet}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title={t('disconnectWallet')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white transition-all ml-1 disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isConnecting ? t('connecting') : t('connectWallet')}
              </span>
            </button>
          )}
        </nav>
      </div>
    </motion.header>
  );
}
