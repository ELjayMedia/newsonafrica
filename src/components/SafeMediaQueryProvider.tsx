'use client';

import { createContext, useContext, type ReactNode } from 'react';

interface MediaQueryContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const MediaQueryContext = createContext<MediaQueryContextType>({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
});

export const useMediaQueryContext = () => useContext(MediaQueryContext);

interface SafeMediaQueryProviderProps {
  children: ReactNode;
}

export default function SafeMediaQueryProvider({ children }: SafeMediaQueryProviderProps) {
  // Provide default values that work for SSR
  const contextValue: MediaQueryContextType = {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  };

  return <MediaQueryContext.Provider value={contextValue}>{children}</MediaQueryContext.Provider>;
}
