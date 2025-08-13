import type { Metadata } from 'next';

import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset Password - News On Africa',
  description: 'Reset your News On Africa password',
};

export default function ResetPasswordPage({ params }: { params: { key: string } }) {
  return <ResetPasswordClient resetKey={params.key} />;
}
