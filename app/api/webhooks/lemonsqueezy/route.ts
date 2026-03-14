export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { addVerifiedToken } from '@/lib/payment-verify';

/**
 * Lemon Squeezy Webhook Endpoint
 * 
 * Receives payment confirmations from Lemon Squeezy.
 * Verifies the webhook signature using HMAC-SHA256.
 * Stores verified payment IDs for the generation token system.
 * 
 * Webhook URL to configure in LS dashboard:
 * https://hurrian.xyz/api/webhooks/lemonsqueezy
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') || req.headers.get('X-Signature') || '';
    const secret = process.env.LS_WEBHOOK_SECRET || '';

    // Verify webhook signature
    if (secret) {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest('hex');

      if (!signature || !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )) {
        console.error('LS Webhook: Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      // No secret configured — log warning but still process
      // This allows the webhook to work before secret is set up
      console.warn('LS Webhook: No LS_WEBHOOK_SECRET configured — skipping signature verification');
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventName = (payload?.meta as Record<string, unknown>)?.event_name;

    if (eventName === 'order_created') {
      const customData = (payload?.meta as Record<string, unknown>)?.custom_data as Record<string, string> | undefined;
      const paymentId = customData?.payment_id;

      if (paymentId) {
        addVerifiedToken(paymentId, 'card');
        console.log(`LS Webhook: Payment verified for token ${paymentId}`);
      } else {
        console.warn('LS Webhook: order_created but no payment_id in custom_data');
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('LS Webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
