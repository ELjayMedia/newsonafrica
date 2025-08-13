import type React from 'react';

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function BookmarksLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
