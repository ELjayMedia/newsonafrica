'use client';

import Link from 'next/link';

import { COUNTRIES, type Country } from '@/config/countries';
import { navConfig } from '@/config/nav';

export default function CountryNav({ country }: { country: string }) {
  if (!COUNTRIES.includes(country as Country)) {
    return <p className="text-sm text-red-600">Unsupported country: {country}</p>;
  }

  return (
    <ul className="flex gap-4">
      {navConfig.map((item) => (
        <li key={item.href}>
          <Link href={`/${country}${item.href}`} className="hover:underline">
            {item.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
