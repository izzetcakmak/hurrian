export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // If not logged in, return empty — users must be authenticated to see history
    if (!session?.user?.id) {
      return NextResponse.json({ songs: [] });
    }

    const limitParam = req?.nextUrl?.searchParams?.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const songs = await prisma.song.findMany({
      where: {
        audioUrl: { not: '' },
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: isNaN(limit) ? 100 : limit,
    });

    return NextResponse.json({ songs: songs ?? [] });
  } catch (err: unknown) {
    console.error('Songs fetch error:', err);
    return NextResponse.json({ songs: [] });
  }
}
