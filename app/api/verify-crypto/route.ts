export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyCryptoPayment } from '@/lib/payment-verify';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Verify a crypto payment transaction on Base mainnet.
 * Returns a generation token if the tx is valid.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

    // Rate limit: 10 verification attempts per hour per IP
    if (!checkRateLimit(ip, 'verify-crypto', 10, 3600000)) {
      return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { txHash, ethPrice } = body || {};

    if (!txHash || typeof txHash !== 'string') {
      return NextResponse.json({ error: 'Missing txHash' }, { status: 400 });
    }

    const price = typeof ethPrice === 'number' && ethPrice > 0 ? ethPrice : 0;

    const result = await verifyCryptoPayment(txHash, price);

    if (!result.valid) {
      return NextResponse.json({ error: result.error || 'Payment verification failed' }, { status: 400 });
    }

    return NextResponse.json({ tokenId: result.tokenId });
  } catch (err) {
    console.error('Crypto verify error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
