'use client';

import { Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';

export function AdBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="max-w-[800px] mx-auto mb-6"
    >
      <div className="bg-gradient-to-r from-blue-900/60 via-blue-800/40 to-red-900/30 rounded-xl border border-yellow-500/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-xs font-semibold text-yellow-300 tracking-wide uppercase">
            Advertising Space Available
          </span>
        </div>
        <span className="text-slate-500 hidden sm:inline">—</span>
        <a
          href="mailto:contact@hurrian.xyz"
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors underline underline-offset-2"
        >
          contact@hurrian.xyz
        </a>
      </div>
    </motion.div>
  );
}
