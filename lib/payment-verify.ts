/**
 * Payment verification system.
 * - Card (Lemon Squeezy): Webhook stores verified payment IDs
 * - Crypto (Base ETH): On-chain transaction verification
 * 
 * Uses in-memory token store. Tokens expire after 15 minutes.
 * Each token can only be consumed once.
 */

import { BASE_MAINNET, PAYMENT_USD, PAYMENT_RECEIVER } from './arc-config';

// ===================== TOKEN STORE =====================

interface PaymentToken {
  createdAt: number;
  type: 'card' | 'crypto';
  consumed: boolean;
}

const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// Use globalThis to persist across hot reloads in dev
const STORE_KEY = '__payment_tokens';
function getTokenStore(): Map<string, PaymentToken> {
  const g = globalThis as Record<string, unknown>;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map<string, PaymentToken>();
  }
  return g[STORE_KEY] as Map<string, PaymentToken>;
}

/** Add a verified payment token (called by webhook or crypto verifier) */
export function addVerifiedToken(tokenId: string, type: 'card' | 'crypto'): void {
  const store = getTokenStore();
  store.set(tokenId, { createdAt: Date.now(), type, consumed: false });
}

/** Check if a token exists and is valid (not consumed, not expired) */
export function isTokenValid(tokenId: string): boolean {
  const store = getTokenStore();
  const token = store.get(tokenId);
  if (!token) return false;
  if (token.consumed) return false;
  if (Date.now() - token.createdAt > TOKEN_EXPIRY_MS) {
    store.delete(tokenId);
    return false;
  }
  return true;
}

/** Consume (use) a token — returns true if successful, false if invalid/already used */
export function consumeToken(tokenId: string): boolean {
  const store = getTokenStore();
  const token = store.get(tokenId);
  if (!token) return false;
  if (token.consumed) return false;
  if (Date.now() - token.createdAt > TOKEN_EXPIRY_MS) {
    store.delete(tokenId);
    return false;
  }
  token.consumed = true;
  // Clean up after a short delay
  setTimeout(() => store.delete(tokenId), 60000);
  return true;
}

// Cleanup expired tokens every 5 minutes
if (typeof globalThis !== 'undefined') {
  const CLEANUP_KEY = '__payment_token_cleanup';
  if (!(globalThis as Record<string, unknown>)[CLEANUP_KEY]) {
    (globalThis as Record<string, unknown>)[CLEANUP_KEY] = true;
    setInterval(() => {
      const now = Date.now();
      const store = getTokenStore();
      Array.from(store.entries()).forEach(([key, token]) => {
        if (now - token.createdAt > TOKEN_EXPIRY_MS) store.delete(key);
      });
    }, 300000);
  }
}

// ===================== CRYPTO TX VERIFICATION =====================

// Store used tx hashes to prevent reuse
const USED_TX_KEY = '__used_tx_hashes';
function getUsedTxStore(): Set<string> {
  const g = globalThis as Record<string, unknown>;
  if (!g[USED_TX_KEY]) {
    g[USED_TX_KEY] = new Set<string>();
  }
  return g[USED_TX_KEY] as Set<string>;
}

/**
 * Verify an ETH transaction on Base mainnet.
 * Checks: tx exists, confirmed, recipient matches, value is sufficient.
 * Returns a payment token ID if valid, null if invalid.
 */
export async function verifyCryptoPayment(txHash: string, ethPrice: number): Promise<{ valid: boolean; error?: string; tokenId?: string }> {
  if (!txHash || !txHash.startsWith('0x') || txHash.length !== 66) {
    return { valid: false, error: 'Invalid transaction hash format' };
  }

  const usedTxStore = getUsedTxStore();
  const normalizedHash = txHash.toLowerCase();

  // Check if tx was already used
  if (usedTxStore.has(normalizedHash)) {
    return { valid: false, error: 'Transaction already used' };
  }

  try {
    // Fetch transaction details from Base RPC
    const txResponse = await fetch(BASE_MAINNET.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1,
      }),
    });

    const txData = await txResponse.json();
    const tx = txData?.result;

    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    // Check if confirmed (has blockNumber)
    if (!tx.blockNumber) {
      return { valid: false, error: 'Transaction not yet confirmed' };
    }

    // Check recipient
    const receiverMatch = tx.to?.toLowerCase() === PAYMENT_RECEIVER.toLowerCase();
    if (!receiverMatch) {
      return { valid: false, error: 'Transaction recipient does not match' };
    }

    // Check value (convert from hex wei to ETH)
    const valueWei = BigInt(tx.value || '0x0');
    const valueEth = Number(valueWei) / 1e18;

    // Expected ETH amount with 20% tolerance (for price fluctuations)
    const expectedEth = ethPrice > 0 ? PAYMENT_USD / ethPrice : 0;
    const minAcceptable = expectedEth * 0.8; // 20% tolerance

    if (expectedEth > 0 && valueEth < minAcceptable) {
      return { valid: false, error: 'Transaction value too low' };
    }

    // Verify tx receipt for success status
    const receiptResponse = await fetch(BASE_MAINNET.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 2,
      }),
    });

    const receiptData = await receiptResponse.json();
    const receipt = receiptData?.result;

    if (!receipt || receipt.status !== '0x1') {
      return { valid: false, error: 'Transaction failed or not yet confirmed' };
    }

    // All checks passed — mark tx as used and create token
    usedTxStore.add(normalizedHash);
    const tokenId = `crypto_${normalizedHash}`;
    addVerifiedToken(tokenId, 'crypto');

    return { valid: true, tokenId };
  } catch (err) {
    console.error('Crypto verification error:', err);
    return { valid: false, error: 'Failed to verify transaction' };
  }
}
