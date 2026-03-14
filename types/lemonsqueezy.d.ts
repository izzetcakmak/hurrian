/* eslint-disable @typescript-eslint/no-explicit-any */
interface LemonSqueezyEventData {
  event: string;
  data?: any;
}

interface LemonSqueezyGlobal {
  Setup: (options: {
    eventHandler?: (event: LemonSqueezyEventData) => void;
  }) => void;
  Url: {
    Open: (url: string) => void;
    Close: () => void;
  };
  Refresh: () => void;
}

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: LemonSqueezyGlobal;
  }
}

export {};
