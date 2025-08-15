import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset Password - News On Africa',
  description: 'Reset your News On Africa password',
};

interface ResetPasswordPageProps {
  params: Promise<{ key: string }>;
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { key } = await params;
  // After successful password reset, redirect to the auth page
  const onSuccess = () => {
    redirect('/auth');
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordClient resetKey={key} onSuccess={onSuccess} />
    </Suspense>
  );
}
