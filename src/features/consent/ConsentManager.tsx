'use client';

import type React from 'react';
import { useEffect } from 'react';

declare global {
  interface Window {
    __tcfapi?: (
      command: string,
      version: number,
      callback: (...args: unknown[]) => void,
      parameter?: unknown,
    ) => void;
  }
}

type TcfApi = (
  command: string,
  version: number,
  callback: (...args: unknown[]) => void,
  parameter?: unknown,
) => void;

type TcfApiStub = TcfApi & { queue: unknown[][] };

interface TCData {
  eventStatus: string;
  listenerId: number;
  gdprApplies: boolean;
  purpose?: { consents?: Record<string, boolean> };
}

export function ConsentManager({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (typeof window.__tcfapi !== 'function') {
      const queue: unknown[][] = [];
      const tcfapi = ((...args: unknown[]) => {
        queue.push(args);
      }) as TcfApiStub;
      tcfapi.queue = queue;
      window.__tcfapi = tcfapi;
    }

    const src = process.env.NEXT_PUBLIC_CMP_SRC;
    if (src && !document.querySelector(`script[src="${src}"]`)) {
      const s = document.createElement('script');
      s.async = true;
      s.src = src;
      document.head.appendChild(s);
    }
  }, []);

  return <>{children}</>;
}

export function waitForTcfConsent(): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 5000);

    const check = () => {
      const api = window.__tcfapi as TcfApi | undefined;
      if (typeof api !== 'function') {
        setTimeout(check, 50);
        return;
      }
      api('addEventListener', 2, (tcData: TCData, success: boolean) => {
        if (!success) {
          clearTimeout(timer);
          resolve(false);
          return;
        }
        const status = tcData.eventStatus;
        if (status === 'tcloaded' || status === 'useractioncomplete') {
          api('removeEventListener', 2, () => {}, tcData.listenerId);
          clearTimeout(timer);
          const gdprApplies = tcData.gdprApplies;
          const consent = tcData.purpose?.consents?.[1] === true;
          resolve(!gdprApplies || consent);
        }
      });
    };

    check();
  });
}
