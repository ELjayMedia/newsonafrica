import Link from "next/link";

import { COUNTRY_LIST, type CountryCode } from "@/lib/countries";

/** Flag emoji per supported edition (regional-indicator pairs). */
const FLAG: Record<CountryCode, string> = {
  sz: "🇸🇿",
  za: "🇿🇦",
  ng: "🇳🇬",
};

function Chip({ href, flag, label }: { href: string; flag: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-[10px] border border-noa-hairline bg-noa-white px-4 py-4 text-center transition-colors hover:border-noa-green"
    >
      <span className="text-2xl" aria-hidden>
        {flag}
      </span>
      <span className="text-sm font-bold leading-tight text-noa-ink">{label}</span>
    </Link>
  );
}

/**
 * "Explore Africa" block (homepage mockup): country-edition chips that jump to
 * each supported edition, plus an "All editions" chip back to the pan-African
 * home. Reads the real edition catalogue so a new edition appears automatically.
 */
export function ExploreAfrica() {
  return (
    <section className="rounded-xl border border-noa-hairline bg-noa-paper p-6">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          🌍
        </span>
        <h2 className="font-display text-xl font-extrabold tracking-[-0.01em] text-noa-ink">
          Explore Africa
        </h2>
      </div>
      <p className="mt-1 text-sm text-noa-muted">
        Discover news from across the continent with our country-specific editions.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {COUNTRY_LIST.map((country) => (
          <Chip
            key={country.code}
            href={`/${country.code}`}
            flag={FLAG[country.code]}
            label={country.name}
          />
        ))}
        <Link
          href="/"
          className="flex flex-col items-center justify-center gap-1 rounded-[10px] bg-noa-ink px-4 py-4 text-center text-sm font-bold text-noa-white transition-opacity hover:opacity-90"
        >
          All editions →
        </Link>
      </div>
    </section>
  );
}
