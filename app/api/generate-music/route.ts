export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { consumeToken } from '@/lib/payment-verify';
import { checkRateLimit } from '@/lib/rate-limit';

const genreStyleMap: Record<string, string> = {
  pop: 'Modern Turkish Pop music. Tempo 100-120 BPM. Catchy male or female vocal. Instruments: synths, electric guitar, bass, electronic drums, modern pop production. Bright emotional melodies about love, life and youth with dynamic arrangement.',
  rock: 'Energetic Turkish Rock music. Tempo 100-140 BPM. Powerful raspy male or female vocal. Instruments: distorted electric guitars, bass guitar, acoustic drums. Strong emotional intensity with melodic variation and anthem style chorus.',
  metal: 'Heavy Metal',
  arabesk: '',
  halkMuzigi: 'Authentic Anatolian Turkish Folk music. Tempo 80-110 BPM. Raw emotional male or female vocal. Instruments: bağlama family, kaval, zurna, davul, folk violin. Earthy rural atmosphere with storytelling lyrics, melodic variation and traditional rhythmic patterns.',
  sanatMuzigi: 'Traditional Turkish Art Music with rich makam influence (Hicaz, Nihavent, Hüzzam, Rast). Tempo 60-90 BPM. Emotional male or female vocal with ornamentation. Instruments: oud, tanbur, kanun, ney, violin ensemble, darbuka. Dramatic, romantic, nostalgic atmosphere with dynamic melodic variations.',
  ilahi: 'Spiritual Islamic nasheed style. Tempo 50-80 BPM. Warm male vocal or choir. Instruments: ney flute, frame drum, soft strings, subtle choir pads. Peaceful sacred atmosphere praising faith, mercy and devotion with emotional melodic development.',
  hiphop: 'Turkish Hip Hop / Rap. Tempo 80-100 BPM. Rhythmic rap vocal male or female. Instruments: heavy kick, snare, bassline, piano or synth samples, scratches. Urban street atmosphere with rhythmic flow and dynamic beat variation.',
  senfoni: 'Grand Orchestral Symphony with full orchestra, strings, brass, woodwinds, timpani, dramatic crescendos, cinematic epic classical composition in the style of Beethoven and Tchaikovsky',
};

const VALID_GENRES = new Set(Object.keys(genreStyleMap));

const ARABESK_PROMPT = 'Epic Turkish arabesk ballad, classic and modern styles, Hicaz-Huzzam-Nihavent-Kurdi makam feel, 65-75 BPM. Deep emotional male vocal, melancholic love, fate, loneliness. Baglama, oud, qanun, ney, violin orchestra, piano, acoustic guitar, soft synths, modern drums, cinematic dramatic chorus.';

const ARABESK_CLASSIC_STRUCTURE = `[Intro: Long, weeping Ney and Oud Taksim]
[Verse 1: Calm but heavy-hearted, deep vocals]
[Pre-Chorus: Orchestral tension building up with violins]
[Chorus: Grand, epic, emotional explosion, powerful vocals]
[Solo: Crying Electric Baglama and Violin Duo]
[Bridge: Slow, dramatic piano and haunting synth pads]
[Outro: Fading away with a lonely Ney solo]`;

function getApiKey(): string {
  return process.env?.MUSICGPT_KEY ?? '';
}

// Input length limits
const MAX_TITLE_LENGTH = 200;
const MAX_LYRICS_LENGTH = 5000;

// Maximum output duration in seconds (2.6 minutes)
const MAX_DURATION_SECONDS = 156;
const MIN_DURATION_SECONDS = 45;

/**
 * Calculate target duration based on lyrics length.
 * Shorter lyrics → shorter song, max 2.6 min (156s).
 * Rough model: ~3-4 seconds per word sung, with a base intro/outro of ~15s.
 */
function calculateTargetDuration(lyrics: string): number {
  const lines = lyrics.split(/\n+/).filter((l) => l.trim().length > 0);
  const words = lyrics.split(/\s+/).filter((w) => w.trim().length > 0);

  const lineCount = lines.length;
  const wordCount = words.length;

  // Each word takes roughly 3 seconds to sing (avg Turkish pop/rock tempo)
  // Plus ~15s for intro/outro/instrumental breaks
  let estimated = wordCount * 3 + 15;

  // Bonus time for longer songs with more structural elements
  if (lineCount > 12) {
    estimated += 10; // extra for chorus repeats, bridge etc.
  }

  // Clamp between min and max
  return Math.max(MIN_DURATION_SECONDS, Math.min(MAX_DURATION_SECONDS, Math.round(estimated)));
}

export async function POST(req: NextRequest) {
  try {
    // --- SECURITY LAYER 1: Rate Limiting ---
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip, 'generate', 50, 3600000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 50 generations per hour.' },
        { status: 429 }
      );
    }

    const body = await req?.json().catch(() => ({}));
    const { title, genre, lyrics, arabeskOptions, paymentToken } = body ?? {};

    // --- SECURITY LAYER 2: Payment Verification ---
    if (!paymentToken || typeof paymentToken !== 'string') {
      return NextResponse.json(
        { error: 'Payment verification required. No valid payment token.' },
        { status: 403 }
      );
    }

    const tokenValid = consumeToken(paymentToken);
    if (!tokenValid) {
      return NextResponse.json(
        { error: 'Invalid or expired payment token. Please complete payment first.' },
        { status: 403 }
      );
    }

    // --- SECURITY LAYER 3: Input Validation ---
    if (!title || !genre || !lyrics) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof title !== 'string' || typeof genre !== 'string' || typeof lyrics !== 'string') {
      return NextResponse.json({ error: 'Invalid field types' }, { status: 400 });
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: `Title too long (max ${MAX_TITLE_LENGTH} chars)` }, { status: 400 });
    }

    if (lyrics.length > MAX_LYRICS_LENGTH) {
      return NextResponse.json({ error: `Lyrics too long (max ${MAX_LYRICS_LENGTH} chars)` }, { status: 400 });
    }

    if (!VALID_GENRES.has(genre)) {
      return NextResponse.json({ error: 'Invalid genre' }, { status: 400 });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Sanitize inputs
    const cleanTitle = title.trim().slice(0, MAX_TITLE_LENGTH);
    const cleanLyrics = lyrics.trim().slice(0, MAX_LYRICS_LENGTH);

    // Build music style
    let musicStyle = genreStyleMap?.[genre] ?? 'Pop';
    let finalLyrics = cleanLyrics;

    if (genre === 'arabesk') {
      musicStyle = ARABESK_PROMPT;
      if (arabeskOptions?.structure === 'classic') {
        finalLyrics = `${ARABESK_CLASSIC_STRUCTURE}\n\n${finalLyrics}`;
      }
    }

    // Calculate target duration based on lyrics length (max 2.6 min = 156s)
    const targetDuration = calculateTargetDuration(cleanLyrics);
    console.log(`[MusicGen] Genre: ${genre}, Words: ${cleanLyrics.split(/\s+/).length}, Target duration: ${targetDuration}s`);

    // Use MusicGPT API
    const response = await fetch('https://api.musicgpt.com/api/public/v1/MusicAI', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        lyrics: finalLyrics,
        music_style: musicStyle,
        make_instrumental: false,
        output_length: targetDuration,
      }),
      cache: 'no-store',
    });

    const responseText = await response?.text().catch(() => '');
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(responseText);
    } catch (_e) {
      console.error('MusicGPT response parse error:', responseText);
      return NextResponse.json({ error: 'Music generation API returned invalid response' }, { status: 502 });
    }

    if (!response?.ok || data?.success === false) {
      console.error('MusicGPT error:', responseText);
      const errorMsg = String(data?.message ?? data?.error ?? 'API error');
      return NextResponse.json({ error: `Music generation failed: ${errorMsg}` }, { status: 502 });
    }

    const taskId = String(data?.task_id ?? '');

    if (!taskId) {
      console.error('No task_id in response:', data);
      return NextResponse.json({ error: 'No task ID returned from API' }, { status: 502 });
    }

    // Get current user session
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id ?? null;

    // Save to database
    const song = await prisma.song.create({
      data: {
        title: cleanTitle,
        genre: String(genre),
        lyrics: cleanLyrics,
        audioUrl: '',
        jobId: taskId,
        duration: 0,
        userId: currentUserId,
      },
    });

    return NextResponse.json({ jobId: taskId, songId: song?.id });
  } catch (err: unknown) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
