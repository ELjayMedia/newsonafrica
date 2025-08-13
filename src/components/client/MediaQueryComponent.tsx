'use client';

import type { ReactNode } from 'react';

import { useMediaQuery } from '@/hooks/useMediaQuery';

interface MediaQueryComponentProps {
  query: string;
  children: (matches: boolean) => ReactNode;
  fallback?: ReactNode;
}

export default function MediaQueryComponent({
  query,
  children,
  fallback,
}: MediaQueryComponentProps) {
  const matches = useMediaQuery(query);

  return <>{children(matches)}</>;
}
