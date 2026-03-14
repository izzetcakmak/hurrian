'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/language-context';

const DEMO_TRACK = {
  title: 'Bu Aşk Hep Alevli',
  genre: 'senfoni',
  audioUrl: 'https://lalals.s3.amazonaws.com/conversions/standard/42fe6863-f0ba-4110-b5c6-bfb2ec85c38b/42fe6863-f0ba-4110-b5c6-bfb2ec85c38b.mp3',
};

export function DemoPlayer() {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setCurrentTime(audio?.currentTime ?? 0);
      const dur = audio?.duration ?? 0;
      setProgress(dur > 0 ? ((audio?.currentTime ?? 0) / dur) * 100 : 0);
    };
    const onLoaded = () => setDuration(audio?.duration ?? 0);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef?.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); } else { audio.play().catch(() => {}); }
    setIsPlaying(!isPlaying);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef?.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * (audio?.duration ?? 0);
  };

  const toggleMute = () => {
    const audio = audioRef?.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (s: number) => {
    const m = Math.floor((s ?? 0) / 60);
    const sec = Math.floor((s ?? 0) % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <section className="max-w-[800px] mx-auto mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-pink-900/20 rounded-2xl p-5 border border-purple-500/20 shadow-lg shadow-purple-500/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Music className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">
            {t('demoTitle')}
          </h3>
          <span className="text-xs font-medium text-purple-400/70 bg-purple-500/10 px-2 py-0.5 rounded-md ml-auto">
            {t('senfoni')}
          </span>
        </div>

        <audio ref={audioRef} src={DEMO_TRACK.audioUrl} preload="metadata" />

        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center hover:shadow-lg hover:shadow-purple-500/30 transition-all flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate mb-1.5">
              {DEMO_TRACK.title}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-10 text-right">{formatTime(currentTime)}</span>
              <div
                className="flex-1 h-1.5 bg-slate-700/60 rounded-full cursor-pointer group"
                onClick={seek}
              >
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full relative transition-all"
                  style={{ width: `${progress ?? 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-xs text-slate-400 w-10">{formatTime(duration)}</span>
            </div>
          </div>

          <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    </section>
  );
}
