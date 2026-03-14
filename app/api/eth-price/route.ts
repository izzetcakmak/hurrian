export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

let cachedPrice = 0;
let lastFetch = 0;
const CACHE_MS = 30000; // 30 seconds cache

export async function GET() {
  const now = Date.now();

  // Return cached if fresh enough
  if (cachedPrice > 0 && now - lastFetch < CACHE_MS) {
    return NextResponse.json({ price: cachedPrice });
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { cache: 'no-store' }
    );
    const data = await res.json();
    const price = data?.ethereum?.usd ?? 0;
    if (price > 0) {
      cachedPrice = price;
      lastFetch = now;
    }
    return NextResponse.json({ price: price || cachedPrice });
  } catch {
    // Return cached even if stale
    return NextResponse.json({ price: cachedPrice });
  }
}
