'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function ResponsiveReturnButton() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const returnPath = from || '/';
  const isMobile = useMediaQuery('(max-width: 768px)');

  const buttonClass = isMobile
    ? 'px-4 py-2 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors text-sm'
    : 'px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors';

  return (
    <Link href={returnPath} className={buttonClass}>
      {from ? 'Return to Previous Page' : 'Return to Homepage'}
    </Link>
  );
}
