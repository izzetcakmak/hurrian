// Base Mainnet Configuration
export const BASE_MAINNET = {
  chainId: 8453,
  chainIdHex: '0x2105',
  name: 'Base',
  rpcUrl: 'https://mainnet.base.org',
  explorer: 'https://basescan.org',
  currencySymbol: 'ETH',
  currencyDecimals: 18,
};

// Payment amount in USD — will be converted to ETH at real-time price
export const PAYMENT_USD = 2.99;

// Receiver wallet address (set via env or fallback)
export const PAYMENT_RECEIVER = process.env.NEXT_PUBLIC_PAYMENT_RECEIVER || '0x0000000000000000000000000000000000000000';
