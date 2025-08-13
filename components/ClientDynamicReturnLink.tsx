'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const SafeReturnLink = dynamic(() => import('./SafeReturnLink'), {
  ssr: false,
  loading: () => (
    <Link
      href="/"
      className="px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
    >
      Return to Homepage
    </Link>
  ),
});

export default function ClientDynamicReturnLink() {
  return <SafeReturnLink />;
}
