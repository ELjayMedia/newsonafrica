import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { isValidCountry } from "@/lib/dal/countries";

interface CountryLayoutProps {
  children: ReactNode;
  params: Promise<{ countryCode: string }>;
}

/**
 * Shared shell for every `/[countryCode]/*` route (NOA-89..92): validates
 * the country segment once, so the home/article/category/tag/author pages
 * don't each re-implement 404 handling for an unknown edition.
 */
export default async function CountryLayout({ children, params }: CountryLayoutProps) {
  const { countryCode } = await params;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  return <>{children}</>;
}
