'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { BrowserProvider, parseEther, formatEther } from 'ethers';
import { BASE_MAINNET, PAYMENT_USD, PAYMENT_RECEIVER } from './arc-config';

interface WalletContextType {
  address: string;
  balance: string; // ETH balance
  ethPrice: number; // current ETH/USD price
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  payForGeneration: () => Promise<string>; // returns tx hash
  error: string;
}

const WalletContext = createContext<WalletContextType>({
  address: '',
  balance: '0',
  ethPrice: 0,
  isConnected: false,
  isConnecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  payForGeneration: async () => '',
  error: '',
});

export function useWallet() {
  return useContext(WalletContext);
}

async function switchToBase() {
  const eth = (window as unknown as Record<string, unknown>)?.ethereum as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  } | undefined;
  if (!eth) return;

  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_MAINNET.chainIdHex }],
    });
  } catch (switchError: unknown) {
    const err = switchError as { code?: number };
    if (err?.code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: BASE_MAINNET.chainIdHex,
            chainName: BASE_MAINNET.name,
            nativeCurrency: {
              name: 'Ether',
              symbol: BASE_MAINNET.currencySymbol,
              decimals: BASE_MAINNET.currencyDecimals,
            },
            rpcUrls: [BASE_MAINNET.rpcUrl],
            blockExplorerUrls: [BASE_MAINNET.explorer],
          },
        ],
      });
    }
  }
}

async function fetchETHPrice(): Promise<number> {
  try {
    const res = await fetch('/api/eth-price', { cache: 'no-store' });
    const data = await res.json();
    return data?.price ?? 0;
  } catch {
    return 0;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [ethPrice, setEthPrice] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const providerRef = useRef<BrowserProvider | null>(null);

  const isConnected = !!address;

  const refreshBalance = useCallback(async (addr: string) => {
    if (!providerRef.current || !addr) return;
    try {
      const raw = await providerRef.current.getBalance(addr);
      setBalance(formatEther(raw));
    } catch {
      setBalance('0');
    }
  }, []);

  // Fetch ETH price on mount and periodically
  useEffect(() => {
    let mounted = true;
    const update = async () => {
      const price = await fetchETHPrice();
      if (mounted && price > 0) setEthPrice(price);
    };
    update();
    const interval = setInterval(update, 60000); // refresh every 60s
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const connectWallet = useCallback(async () => {
    const eth = (window as unknown as Record<string, unknown>)?.ethereum as {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    } | undefined;

    if (!eth) {
      setError('MetaMask bulunamadı. Lütfen MetaMask yükleyin.');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      await switchToBase();
      const provider = new BrowserProvider(eth as never);
      providerRef.current = provider;
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      const addr = accounts?.[0] ?? '';
      setAddress(addr);
      await refreshBalance(addr);
      // Also refresh price on connect
      const price = await fetchETHPrice();
      if (price > 0) setEthPrice(price);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Wallet bağlantı hatası';
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [refreshBalance]);

  const disconnectWallet = useCallback(() => {
    setAddress('');
    setBalance('0');
    providerRef.current = null;
  }, []);

  const payForGeneration = useCallback(async (): Promise<string> => {
    if (!providerRef.current || !address) {
      throw new Error('Wallet bağlı değil');
    }

    if (PAYMENT_RECEIVER === '0x0000000000000000000000000000000000000000') {
      throw new Error('Ödeme alıcı adresi yapılandırılmamış');
    }

    // Get fresh ETH price
    let currentPrice = ethPrice;
    if (currentPrice <= 0) {
      currentPrice = await fetchETHPrice();
      if (currentPrice > 0) setEthPrice(currentPrice);
    }
    if (currentPrice <= 0) {
      throw new Error('ETH fiyatı alınamadı. Lütfen tekrar deneyin.');
    }

    // Calculate ETH amount for $5
    const ethAmount = PAYMENT_USD / currentPrice;
    // Round to 8 decimal places to avoid precision issues
    const ethAmountStr = ethAmount.toFixed(8);

    const signer = await providerRef.current.getSigner();
    const tx = await signer.sendTransaction({
      to: PAYMENT_RECEIVER,
      value: parseEther(ethAmountStr),
    });
    const receipt = await tx.wait();

    // Refresh balance after payment
    await refreshBalance(address);

    return receipt?.hash ?? tx.hash;
  }, [address, ethPrice, refreshBalance]);

  // Listen for account/chain changes
  useEffect(() => {
    const eth = (window as unknown as Record<string, unknown>)?.ethereum as {
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    } | undefined;
    if (!eth?.on) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs?.length === 0) {
        disconnectWallet();
      } else {
        setAddress(accs[0]);
        refreshBalance(accs[0]);
      }
    };

    eth.on('accountsChanged', handleAccountsChanged);
    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, [disconnectWallet, refreshBalance]);

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        ethPrice,
        isConnected,
        isConnecting,
        connectWallet,
        disconnectWallet,
        payForGeneration,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
