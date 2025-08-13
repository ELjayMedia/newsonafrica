'use client';

import { useState, useCallback } from 'react';

import { useAuth } from '@/hooks/useAuth';

interface OpenModalOptions {
  defaultTab?: 'signin' | 'signup';
  returnTo?: string;
}

export function useAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<OpenModalOptions>({
    defaultTab: 'signin',
    returnTo: undefined,
  });
  const { isAuthenticated } = useAuth();

  const open = useCallback(
    (opts: OpenModalOptions = {}) => {
      // Don't open if already authenticated
      if (isAuthenticated) return;

      setOptions({
        defaultTab: opts.defaultTab || 'signin',
        returnTo: opts.returnTo,
      });
      setIsOpen(true);
    },
    [isAuthenticated],
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    options,
    open,
    close,
  };
}
