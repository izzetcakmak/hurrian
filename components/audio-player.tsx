'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface AudioPlayerProps {
  src: string;
  title: string;
}

export function AudioPlayer({ src, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const { t } = useLanguage();

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
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
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
    <div className="bg-slate-800/60 rounded-xl p-4 border border-white/5">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center hover:shadow-lg hover:shadow-blue-500/30 transition-all flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate mb-1.5">{title ?? 'Untitled'}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-10 text-right">{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1.5 bg-slate-700 rounded-full cursor-pointer group"
              onClick={seek}
            >
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-red-500 rounded-full relative transition-all"
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

        <a
          href={src}
          download={`${title ?? 'song'}.mp3`}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs font-medium transition-all flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          {t('download')}
        </a>
      </div>
    </div>
  );
}
