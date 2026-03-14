'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/language-context';
import { AudioPlayer } from './audio-player';
import { Clock, Music } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  genre: string;
  lyrics: string;
  audioUrl: string;
  createdAt: string;
}

export function RecentSongs() {
  const { t } = useLanguage();
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    fetch('/api/songs?limit=4')
      .then((r) => r?.json?.().catch(() => ({ songs: [] })))
      .then((d) => setSongs(d?.songs ?? []))
      .catch(() => {});
  }, []);

  if ((songs?.length ?? 0) === 0) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-400" />
          {t('featuredTitle')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(songs ?? []).map((song, i) => (
            <motion.div
              key={song?.id ?? i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-slate-800/30 rounded-xl p-4 border border-white/5 hover:border-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Music className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                  {t(song?.genre ?? '')}
                </span>
              </div>
              <AudioPlayer src={song?.audioUrl ?? ''} title={song?.title ?? ''} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
