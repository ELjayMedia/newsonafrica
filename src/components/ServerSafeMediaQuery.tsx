import type { ReactNode } from 'react';

import ClientMediaQueryWrapper from './client/ClientMediaQueryWrapper';

interface ServerSafeMediaQueryProps {
  query: string;
  children: (matches: boolean) => ReactNode;
  fallback?: ReactNode;
}

export default function ServerSafeMediaQuery({
  query,
  children,
  fallback,
}: ServerSafeMediaQueryProps) {
  return (
    <>
      {fallback && <noscript>{fallback}</noscript>}
      <ClientMediaQueryWrapper type="mediaQuery" query={query}>
        {children}
      </ClientMediaQueryWrapper>
    </>
  );
}
