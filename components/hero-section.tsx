'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/language-context';
import { ChevronDown } from 'lucide-react';

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        {/* Built on Arc Network badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-xs font-semibold text-blue-300 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {t('builtOnArc')}
          </span>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl font-black mb-4 tracking-tight"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-red-400 bg-clip-text text-transparent">
            HURRIAN
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg md:text-xl text-slate-300 max-w-xl mx-auto mb-3 font-medium"
        >
          {t('slogan')}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-sm md:text-base text-slate-400 max-w-lg mx-auto mb-8"
        >
          {t('heroSubtitle')}
        </motion.p>

        <motion.a
          href="#generator"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-red-500 text-white font-bold text-base hover:shadow-xl hover:shadow-blue-500/20 transition-all pulse-glow"
        >
          {t('startCreating')}
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </motion.a>
      </motion.div>

      {/* Floating music notes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['🎵', '🎶', '🎼', '🎹', '🎸'].map((emoji, i) => (
          <motion.span
            key={i}
            className="absolute text-2xl opacity-20"
            style={{
              left: `${15 + i * 18}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              rotate: [-5, 5, -5],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>
    </section>
  );
}
