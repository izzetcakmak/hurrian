export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getApiKey(): string {
  return process.env?.MUSICGPT_KEY ?? '';
}

export async function GET(req: NextRequest) {
  try {
    const jobId = req?.nextUrl?.searchParams?.get('jobId') ?? '';
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Poll MusicGPT conversion status by task_id
    const url = new URL('https://api.musicgpt.com/api/public/v1/byId');
    url.searchParams.set('conversionType', 'MUSIC_AI');
    url.searchParams.set('task_id', jobId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
      },
      cache: 'no-store',
    });

    const responseText = await response?.text().catch(() => '');
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(responseText);
    } catch (_e) {
      console.error('Status check parse error:', responseText);
      return NextResponse.json({ status: 'pending' });
    }

    if (!response?.ok || data?.success === false) {
      // If API returns error, still treat as pending unless it's a clear failure
      const msg = String(data?.message ?? '');
      if (msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error')) {
        return NextResponse.json({
          status: 'error',
          error: msg || 'Music generation failed. Please try again.',
        });
      }
      return NextResponse.json({ status: 'pending' });
    }

    const conversion = data?.conversion as Record<string, unknown> | undefined;
    if (!conversion) {
      return NextResponse.json({ status: 'pending' });
    }

    const convStatus = String(conversion?.status ?? 'IN_QUEUE').toUpperCase();

    if (convStatus === 'COMPLETED') {
      // MusicGPT returns audio in conversion_path_1 (not audio_url)
      const audioUrl = String(conversion?.conversion_path_1 ?? conversion?.audio_url ?? '');
      const duration = Number(conversion?.conversion_duration_1 ?? 0);

      if (audioUrl) {
        // Update song in database
        const song = await prisma.song.findFirst({
          where: { jobId: String(jobId) },
        });

        if (song) {
          await prisma.song.update({
            where: { id: song.id },
            data: {
              audioUrl: audioUrl,
              duration: Math.round(duration),
            },
          });

          return NextResponse.json({
            status: 'complete',
            audioUrl,
            songId: song?.id,
            duration: Math.round(duration),
          });
        }
      }

      return NextResponse.json({ status: 'complete', audioUrl });
    }

    if (convStatus === 'FAILED' || convStatus === 'ERROR') {
      return NextResponse.json({
        status: 'error',
        error: String(conversion?.status_msg ?? 'Music generation failed. Please try again.'),
      });
    }

    // IN_QUEUE or other statuses = still pending
    return NextResponse.json({ status: 'pending' });
  } catch (err: unknown) {
    console.error('Check status error:', err);
    return NextResponse.json({ status: 'pending' });
  }
}
