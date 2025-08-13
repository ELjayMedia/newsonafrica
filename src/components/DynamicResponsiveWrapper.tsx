'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const ResponsiveWrapper = dynamic(() => import('./ResponsiveWrapper'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-4 w-full rounded" />,
});

interface DynamicResponsiveWrapperProps {
  children: ReactNode;
  mobileContent?: ReactNode;
  desktopContent?: ReactNode;
  breakpoint?: string;
  fallback?: ReactNode;
}

export default function DynamicResponsiveWrapper({
  children,
  mobileContent,
  desktopContent,
  breakpoint,
  fallback,
}: DynamicResponsiveWrapperProps) {
  return (
    <ResponsiveWrapper
      mobileContent={mobileContent}
      desktopContent={desktopContent}
      breakpoint={breakpoint}
    >
      {children}
    </ResponsiveWrapper>
  );
}
