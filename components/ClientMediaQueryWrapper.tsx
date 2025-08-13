'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const ResponsiveReturnButton = dynamic(() => import('./client/ResponsiveReturnButton'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center">
      <Link
        href="/"
        className="px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
      >
        Return to Homepage
      </Link>
    </div>
  ),
});

export default function ClientMediaQueryWrapper() {
  return <ResponsiveReturnButton />;
}
