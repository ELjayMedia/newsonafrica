'use client';

import type { ReactNode } from 'react';

import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ResponsiveWrapperProps {
  children: ReactNode;
  mobileContent?: ReactNode;
  desktopContent?: ReactNode;
  breakpoint?: string;
}

export default function ResponsiveWrapper({
  children,
  mobileContent,
  desktopContent,
  breakpoint = '(min-width: 768px)',
}: ResponsiveWrapperProps) {
  const isDesktop = useMediaQuery(breakpoint);

  if (mobileContent && desktopContent) {
    return isDesktop ? <>{desktopContent}</> : <>{mobileContent}</>;
  }

  return <>{children}</>;
}
