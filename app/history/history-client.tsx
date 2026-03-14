'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/language-context';
import { genres } from '@/lib/i18n';
import { AudioPlayer } from '@/components/audio-player';
import { History, Music, Calendar, FileText, Filter } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  genre: string;
  lyrics: string;
  audioUrl: string;
  createdAt: string;
}

export function HistoryClient() {
  const { t } = useLanguage();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGenre, setFilterGenre] = useState<string>('');

  useEffect(() => {
    fetch('/api/songs')
      .then((r) => r?.json?.().catch(() => ({ songs: [] })))
      .then((d) => setSongs(d?.songs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredSongs = filterGenre
    ? (songs ?? []).filter((s) => s?.genre === filterGenre)
    : songs ?? [];

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr)?.toLocaleDateString?.('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) ?? dateStr;
    } catch {
      return dateStr ?? '';
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <History className="w-8 h-8 text-blue-400" />
          {t('history')}
        </h1>
        <p className="text-slate-400 mb-8">{t('slogan')}</p>

        {/* Genre Filter */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <Filter className="w-4 h-4 text-slate-400" />
          <button
            onClick={() => setFilterGenre('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !filterGenre
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'bg-slate-800/40 text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            {t('allGenres')}
          </button>
          {(genres ?? []).map((g) => (
            <button
              key={g?.id}
              onClick={() => setFilterGenre(g?.id ?? '')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterGenre === g?.id
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'bg-slate-800/40 text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {g?.icon} {t(g?.id ?? '')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (filteredSongs?.length ?? 0) === 0 ? (
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">{t('noSongs')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(filteredSongs ?? []).map((song, i) => (
              <motion.div
                key={song?.id ?? i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="bg-slate-800/30 rounded-xl p-5 border border-white/5 hover:border-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    {t(song?.genre ?? '')}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(song?.createdAt ?? '')}
                  </span>
                </div>

                <AudioPlayer src={song?.audioUrl ?? ''} title={song?.title ?? ''} />

                {song?.lyrics && (
                  <details className="mt-3 group">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {t('lyrics')}
                    </summary>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap bg-slate-900/50 rounded-lg p-3">
                      {song?.lyrics}
                    </p>
                  </details>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
