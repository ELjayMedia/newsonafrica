'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const MediaQueryComponent = dynamic(() => import('./MediaQueryComponent'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-8 w-32 rounded" />,
});

const ResponsiveReturnButton = dynamic(() => import('./ResponsiveReturnButton'), {
  ssr: false,
  loading: () => (
    <div className="px-6 py-3 bg-gray-200 text-gray-400 font-medium rounded-md animate-pulse">
      Loading...
    </div>
  ),
});

interface ClientMediaQueryWrapperProps {
  type: 'mediaQuery' | 'returnButton';
  query?: string;
  children?: (matches: boolean) => ReactNode;
}

export default function ClientMediaQueryWrapper({
  type,
  query,
  children,
}: ClientMediaQueryWrapperProps) {
  if (type === 'returnButton') {
    return <ResponsiveReturnButton />;
  }

  if (type === 'mediaQuery' && query && children) {
    return <MediaQueryComponent query={query}>{children}</MediaQueryComponent>;
  }

  return null;
}
