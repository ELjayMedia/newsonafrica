'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * Lazily loads a component with a loading fallback
 */
export function lazyLoadComponent<P = unknown>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  LoadingComponent: ComponentType<unknown> | null = null,
) {
  return dynamic(importFunc, {
    ...(LoadingComponent ? { loading: () => <LoadingComponent /> } : {}),
    ssr: false,
  });
}

/**
 * Lazily loads a component with a skeleton loading state
 */
export function lazyLoadSkeleton<P = unknown>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  SkeletonComponent: ComponentType<unknown>,
) {
  return dynamic(importFunc, {
    loading: () => <SkeletonComponent />,
    ssr: false,
  });
}
