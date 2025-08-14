declare global {
  interface Window {
    googletag?: googletag.Googletag;
    __tcfapi?: (
      command: string,
      version: number,
      callback: (...args: unknown[]) => void,
      parameter?: unknown,
    ) => void;
  }
}

export {};
