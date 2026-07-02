import Link from "next/link";

import type { Country } from "@/lib/dal/types";

export interface CountryEditionNoticeProps {
  current: Country;
  preferred: Country;
}

/**
 * Slim banner shown when the visitor's persisted country cookie (NOA-92,
 * `/api/set-country`) doesn't match the edition they're currently viewing —
 * e.g. they followed a link into a different edition. Never redirects
 * automatically; just offers a one-click switch back.
 */
export function CountryEditionNotice({ current, preferred }: CountryEditionNoticeProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 ui-sm text-muted-foreground">
      <span>You&apos;re viewing the {current.name} edition.</span>
      <Link href={`/${preferred.code}`} className="font-medium text-primary hover:underline">
        Switch to your {preferred.name} edition
      </Link>
    </div>
  );
}
