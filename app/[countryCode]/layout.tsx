import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { CountryEditionNotice } from "@/components/country-edition-notice";
import { getCountry, isValidCountry } from "@/lib/dal/countries";

interface CountryLayoutProps {
  children: ReactNode;
  params: Promise<{ countryCode: string }>;
}

/**
 * Shared shell for every `/[countryCode]/*` route (NOA-89..92): validates
 * the country segment once (so the home/article/category/tag/author pages
 * don't each re-implement 404 handling), and surfaces a switch-back banner
 * when the visitor's persisted `country` cookie (`/api/set-country`,
 * NOA-92) disagrees with the edition they're currently viewing.
 */
export default async function CountryLayout({ children, params }: CountryLayoutProps) {
  const { countryCode } = await params;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  const current = getCountry(countryCode);
  if (!current) {
    notFound();
  }

  const cookieStore = await cookies();
  const preferredCode = cookieStore.get("country")?.value;
  const preferred =
    preferredCode && isValidCountry(preferredCode) && preferredCode !== countryCode
      ? getCountry(preferredCode)
      : null;

  return (
    <>
      {preferred ? (
        <Container>
          <CountryEditionNotice current={current} preferred={preferred} />
        </Container>
      ) : null}
      {children}
    </>
  );
}
