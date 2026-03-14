'use client';

import Script from 'next/script';

export function LemonSqueezyLoader() {
  return (
    <Script
      src="https://app.lemonsqueezy.com/js/lemon.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== 'undefined' && window.createLemonSqueezy) {
          window.createLemonSqueezy();
        }
      }}
    />
  );
}
