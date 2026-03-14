'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/language-context';
import { useWallet } from '@/lib/wallet-context';
import { genres } from '@/lib/i18n';
import { PAYMENT_USD } from '@/lib/arc-config';
import { AudioPlayer } from './audio-player';
import {
  Sparkles, Music2, Loader2, AlertCircle, Type, FileText,
  Wallet, Settings2, CreditCard, Bitcoin,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface GeneratedSong {
  id: string;
  title: string;
  genre: string;
  audioUrl: string;
}

interface ArabeskOptions {
  makam: string;
  vocal: string;
  instrument: string;
  structure: string;
}

const MAKAM_OPTIONS = [
  { id: 'hicaz', key: 'makamHicaz' },
  { id: 'huzzam', key: 'makamHuzzam' },
  { id: 'nihavend', key: 'makamNihavend' },
  { id: 'kurdilihicazkar', key: 'makamKurdilihicazkar' },
];

const VOCAL_OPTIONS = [
  { id: 'muslum', key: 'vocalMuslum', icon: '\uD83C\uDFA4' },
  { id: 'ibrahim', key: 'vocalIbrahim', icon: '\uD83C\uDF99\uFE0F' },
  { id: 'ferdi', key: 'vocalFerdi', icon: '\uD83C\uDFB6' },
  { id: 'female', key: 'vocalFemale', icon: '\uD83D\uDC69\u200D\uD83C\uDFA4' },
];

const INSTRUMENT_OPTIONS = [
  { id: 'violin', key: 'instViolin', icon: '\uD83C\uDFBB' },
  { id: 'baglama', key: 'instBaglama', icon: '\uD83E\uDE95' },
  { id: 'ney', key: 'instNey', icon: '\uD83E\uDE88' },
  { id: 'kanun', key: 'instKanun', icon: '\uD83C\uDFB5' },
];

const STRUCTURE_OPTIONS = [
  { id: 'classic', key: 'structureClassic' },
  { id: 'free', key: 'structureFree' },
];

function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function MusicGenerator() {
  const { t } = useLanguage();
  const { isConnected, connectWallet, payForGeneration, balance, ethPrice } = useWallet();

  const [paymentMode, setPaymentMode] = useState<'card' | 'crypto'>('card');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [lyrics, setLyrics] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedSong, setGeneratedSong] = useState<GeneratedSong | null>(null);
  const [error, setError] = useState('');
  const [arabeskOptions, setArabeskOptions] = useState<ArabeskOptions>({
    makam: 'hicaz',
    vocal: 'muslum',
    instrument: 'violin',
    structure: 'classic',
  });

  // Ref to hold pending generation params while LS overlay is open
  const pendingParamsRef = useRef<{
    title: string;
    genre: string;
    lyrics: string;
    arabeskOptions: ArabeskOptions;
    paymentId: string;
  } | null>(null);

  const priceDisplay = `$${PAYMENT_USD}`;

  // --- Music generation logic (shared by both payment paths) ---
  const startGeneration = useCallback(async (
    params: { title: string; genre: string; lyrics: string; arabeskOptions?: ArabeskOptions },
    paymentToken: string
  ) => {
    setIsGenerating(true);
    setProgress(0);
    setGeneratedSong(null);
    setError('');

    try {
      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: params.title,
          genre: params.genre,
          lyrics: params.lyrics,
          paymentToken,
          ...(params.genre === 'arabesk' && params.arabeskOptions ? { arabeskOptions: params.arabeskOptions } : {}),
        }),
      });

      if (!res?.ok) {
        const errData = await res?.json().catch(() => ({}));
        throw new Error(errData?.error ?? t('errorMessage'));
      }

      const data = await res.json();
      const jobId = data?.jobId;
      if (!jobId) throw new Error(t('errorMessage'));

      let attempts = 0;
      const maxAttempts = 40;

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 15000));
        attempts++;
        setProgress(Math.min(90, Math.floor((attempts / maxAttempts) * 100)));

        const statusRes = await fetch(`/api/check-status?jobId=${jobId}`);
        const statusData = await statusRes?.json().catch(() => ({}));

        if (statusData?.status === 'complete') {
          setProgress(100);
          setGeneratedSong({
            id: statusData?.songId ?? '',
            title: params.title,
            genre: params.genre,
            audioUrl: statusData?.audioUrl ?? '',
          });
          toast.success(t('successMessage'));
          setIsGenerating(false);
          return;
        }

        if (statusData?.status === 'error') {
          throw new Error(statusData?.error ?? t('errorMessage'));
        }
      }

      throw new Error('Timeout');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err?.message : t('errorMessage');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [t]);

  // --- Lemon Squeezy event handler ---
  useEffect(() => {
    function setupLS() {
      if (typeof window !== 'undefined' && window.LemonSqueezy) {
        window.LemonSqueezy.Setup({
          eventHandler: (event) => {
            if (event?.event === 'Checkout.Success') {
              toast.success(t('paymentSuccess'), { id: 'ls-pay' });
              const params = pendingParamsRef.current;
              if (params) {
                const paymentId = params.paymentId;
                pendingParamsRef.current = null;
                setIsPaying(false);

                // Wait a moment for webhook to arrive, then try generation
                // If webhook hasn't arrived yet, we retry a few times
                const tryGenerate = async (retries: number) => {
                  try {
                    await startGeneration(
                      { title: params.title, genre: params.genre, lyrics: params.lyrics, arabeskOptions: params.arabeskOptions },
                      paymentId
                    );
                  } catch {
                    if (retries > 0) {
                      await new Promise(r => setTimeout(r, 3000));
                      await tryGenerate(retries - 1);
                    }
                  }
                };

                // Wait 2s for webhook, then try (with 3 retries)
                setTimeout(() => tryGenerate(3), 2000);
              }
            }
            if (event?.event === 'Checkout.Closed') {
              if (pendingParamsRef.current) {
                pendingParamsRef.current = null;
                setIsPaying(false);
                toast.dismiss('ls-pay');
              }
            }
          },
        });
      }
    }

    setupLS();
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.LemonSqueezy) {
        setupLS();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [t, startGeneration]);

  // --- Card payment handler (Lemon Squeezy overlay) ---
  const handleCardPayment = () => {
    setError('');
    if (!songTitle?.trim()) { toast.error(t('enterTitle')); return; }
    if (!lyrics?.trim()) { toast.error(t('enterLyrics')); return; }
    if (!selectedGenre) { toast.error(t('selectGenre')); return; }

    const baseCheckoutUrl = process.env.NEXT_PUBLIC_LS_CHECKOUT_URL;
    if (!baseCheckoutUrl) {
      toast.error('Payment not configured');
      return;
    }

    // Generate a unique payment ID and attach to checkout URL as custom data
    const paymentId = generatePaymentId();
    const checkoutUrl = `${baseCheckoutUrl}?checkout[custom][payment_id]=${encodeURIComponent(paymentId)}`;

    // Save params so we can start generation after payment
    pendingParamsRef.current = {
      title: songTitle,
      genre: selectedGenre,
      lyrics,
      arabeskOptions,
      paymentId,
    };
    setIsPaying(true);
    toast.loading(t('paymentProcessing'), { id: 'ls-pay' });

    // Open Lemon Squeezy overlay
    if (window.LemonSqueezy) {
      window.LemonSqueezy.Url.Open(checkoutUrl);
    } else {
      window.open(checkoutUrl, '_blank');
    }
  };

  // --- Crypto payment handler ---
  const handleCryptoPayment = async () => {
    setError('');
    if (!songTitle?.trim()) { toast.error(t('enterTitle')); return; }
    if (!lyrics?.trim()) { toast.error(t('enterLyrics')); return; }
    if (!selectedGenre) { toast.error(t('selectGenre')); return; }

    if (!isConnected) {
      toast.error(t('walletRequired'));
      connectWallet();
      return;
    }

    const requiredEth = ethPrice > 0 ? PAYMENT_USD / ethPrice : 0;
    if (requiredEth > 0 && parseFloat(balance) < requiredEth) {
      toast.error(t('insufficientBalance'));
      return;
    }

    setIsPaying(true);
    try {
      toast.loading(t('paymentProcessing'), { id: 'payment' });

      // Step 1: Send ETH payment
      const txHash = await payForGeneration();
      toast.success(t('paymentSuccess'), { id: 'payment' });

      // Step 2: Verify transaction on-chain and get payment token
      toast.loading(t('verifyingPayment'), { id: 'verify' });
      const verifyRes = await fetch('/api/verify-crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, ethPrice }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData?.tokenId) {
        throw new Error(verifyData?.error || t('paymentFailed'));
      }

      toast.success(t('verifyingPayment'), { id: 'verify' });
      setIsPaying(false);

      // Step 3: Start generation with verified token
      await startGeneration(
        { title: songTitle, genre: selectedGenre, lyrics, arabeskOptions },
        verifyData.tokenId
      );
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? t('paymentFailed');
      toast.error(`${t('paymentFailed')}: ${msg}`, { id: 'payment' });
      toast.dismiss('verify');
      setIsPaying(false);
    }
  };

  const handleGenerate = () => {
    if (paymentMode === 'card') {
      handleCardPayment();
    } else {
      handleCryptoPayment();
    }
  };

  return (
    <section id="generator" className="max-w-[800px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-6 md:p-8 border border-white/5 shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-400" />
          {t('generateMusic')}
        </h2>

        {/* Genre Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-1.5">
            <Music2 className="w-4 h-4 text-blue-400" />
            {t('selectGenre')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(genres ?? []).map((g) => (
              <button
                key={g?.id}
                onClick={() => setSelectedGenre(g?.id ?? '')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                  selectedGenre === g?.id
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-800/40 border-white/5 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
                }`}
              >
                <span className="text-lg">{g?.icon ?? '\uD83C\uDFB5'}</span>
                <div className="text-left">
                  <div>{t(g?.id ?? '')}</div>
                  <div className="text-[10px] opacity-60">{t(`${g?.id ?? ''}Desc`)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Arabesk Customization Panel */}
        <AnimatePresence>
          {selectedGenre === 'arabesk' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 via-slate-800/40 to-red-900/20 border border-purple-500/20">
                <h3 className="text-sm font-semibold text-purple-300 mb-4 flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  {t('arabeskCustomize')}
                </h3>

                {/* Makam */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-slate-400 mb-2 block">{t('arabeskMakam')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MAKAM_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setArabeskOptions((p) => ({ ...p, makam: m.id }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          arabeskOptions.makam === m.id
                            ? 'bg-purple-600/30 border-purple-500/50 text-purple-200'
                            : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {t(m.key)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vocal */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-slate-400 mb-2 block">{t('arabeskVocal')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {VOCAL_OPTIONS.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setArabeskOptions((p) => ({ ...p, vocal: v.id }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1 ${
                          arabeskOptions.vocal === v.id
                            ? 'bg-red-600/25 border-red-500/50 text-red-200'
                            : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span>{v.icon}</span>
                        {t(v.key)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instrument */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-slate-400 mb-2 block">{t('arabeskInstrument')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {INSTRUMENT_OPTIONS.map((ins) => (
                      <button
                        key={ins.id}
                        onClick={() => setArabeskOptions((p) => ({ ...p, instrument: ins.id }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1 ${
                          arabeskOptions.instrument === ins.id
                            ? 'bg-amber-600/25 border-amber-500/50 text-amber-200'
                            : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span>{ins.icon}</span>
                        {t(ins.key)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Structure */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">{t('arabeskStructure')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {STRUCTURE_OPTIONS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setArabeskOptions((p) => ({ ...p, structure: s.id }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          arabeskOptions.structure === s.id
                            ? 'bg-blue-600/25 border-blue-500/50 text-blue-200'
                            : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {t(s.key)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title */}
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-1.5">
            <Type className="w-4 h-4 text-blue-400" />
            {t('titleLabel')}
          </label>
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e?.target?.value ?? '')}
            placeholder={t('titlePlaceholder')}
            maxLength={200}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
            disabled={isGenerating}
          />
        </div>

        {/* Lyrics */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-400" />
            {t('lyrics')}
          </label>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e?.target?.value ?? '')}
            placeholder={t('lyricsPlaceholder')}
            rows={5}
            maxLength={5000}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
            disabled={isGenerating}
          />
        </div>

        {/* Payment Mode Tabs */}
        <div className="mb-5">
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            <button
              onClick={() => setPaymentMode('card')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                paymentMode === 'card'
                  ? 'bg-blue-600/30 text-blue-300 border-r border-blue-500/30'
                  : 'bg-slate-800/40 text-slate-500 hover:text-slate-300 border-r border-white/5'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              {t('payWithCard')}
            </button>
            <button
              onClick={() => setPaymentMode('crypto')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                paymentMode === 'crypto'
                  ? 'bg-orange-600/30 text-orange-300'
                  : 'bg-slate-800/40 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Bitcoin className="w-4 h-4" />
              {t('payWithCrypto')}
            </button>
          </div>
        </div>

        {/* Crypto Mode: Wallet info */}
        {paymentMode === 'crypto' && (
          <div className="mb-4">
            {!isConnected ? (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <Wallet className="w-4 h-4" />
                  <span>{t('walletRequired')}</span>
                </div>
                <button
                  onClick={connectWallet}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <Wallet className="w-4 h-4" />
                  {t('connectWallet')}
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block animate-pulse" />
                  {t('arcPaymentInfo')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Card Mode: info */}
        {paymentMode === 'card' && (
          <div className="mb-4">
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs text-slate-400">{t('cardPaymentInfo')}</span>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isPaying}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            paymentMode === 'card'
              ? 'bg-gradient-to-r from-blue-600 to-purple-500 hover:shadow-blue-500/20'
              : 'bg-gradient-to-r from-blue-600 to-red-500 hover:shadow-blue-500/20'
          }`}
        >
          {isPaying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('paymentProcessing')}
            </>
          ) : isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {t('generateMusic')} — {priceDisplay}
            </>
          )}
        </button>

        {/* Progress Bar */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">{t('waitingMessage')}</p>
                <span className="text-sm font-medium text-blue-400">{progress ?? 0}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-red-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress ?? 0}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex items-end justify-center gap-1 mt-4 h-8">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-blue-500 to-red-500 rounded-full wave-bar"
                    style={{
                      height: `${20 + ((i * 37 + 13) % 80)}%`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generated Song */}
        <AnimatePresence>
          {generatedSong && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <AudioPlayer src={generatedSong?.audioUrl ?? ''} title={generatedSong?.title ?? ''} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
