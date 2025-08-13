import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/server/auth';

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/signin');
  return <>{children}</>;
}
