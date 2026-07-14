"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  COUNTRIES,
  PUBLIC_COUNTRY_LIST,
  isPublicCountry,
  isValidCountry,
  type CountryCode,
} from "@/lib/countries";
import { cn } from "@/lib/utils";

function countryFromPath(pathname: string): CountryCode | null {
  const segment = pathname.split("/")[1];
  return segment && isValidCountry(segment) ? segment : null;
}

/** Swap the leading `/[countryCode]` path segment, preserving the rest of the path. */
function replaceCountryInPath(
  pathname: string,
  current: CountryCode | null,
  next: CountryCode,
): string {
  if (!current) return `/${next}`;
  const segments = pathname.split("/");
  segments[1] = next;
  return segments.join("/");
}

/**
 * Country/edition switcher (NOA-92): lives in the site header, always
 * visible. Detects the current edition from the URL, persists the choice via
 * `/api/set-country` (read back by `app/[countryCode]/layout.tsx`), and
 * navigates to the same page in the new edition.
 */
export function CountrySwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = countryFromPath(pathname);
  const countryOptions =
    current && !isPublicCountry(current)
      ? [COUNTRIES[current], ...PUBLIC_COUNTRY_LIST]
      : PUBLIC_COUNTRY_LIST;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    if (!isValidCountry(next)) return;

    void fetch("/api/set-country", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: next }),
    }).catch(() => {
      // Non-fatal — navigation still proceeds even if the cookie write fails.
    });

    router.push(replaceCountryInPath(pathname, current, next));
  };

  return (
    <label className={cn("inline-flex items-center", className)}>
      <span className="sr-only">Choose country edition</span>
      <select
        value={current ?? ""}
        onChange={handleChange}
        aria-label="Choose country edition"
        className="ui-md h-10 rounded-md border border-input bg-background px-2 text-foreground"
      >
        {!current ? (
          <option value="" disabled>
            Edition
          </option>
        ) : null}
        {countryOptions.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </label>
  );
}
