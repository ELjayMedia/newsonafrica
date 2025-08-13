'use client';

import type { ReactNode } from 'react';

import ErrorBoundary from './ErrorBoundary';

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
}

export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  return <ErrorBoundary fallback={<div>Something went wrong</div>}>{children}</ErrorBoundary>;
}
