"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { isArticlePath } from "@/lib/article/route";
import { DEFAULT_COUNTRY, isValidCountry, type CountryCode } from "@/lib/countries";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom navigation (NOA-111). Fixed to the bottom edge, hidden at
 * md+ where the header navigation takes over. Deliberately core-utilities
 * only (Link/usePathname/cn/countries — reference:
 * legacy/components/BottomNavigation.tsx) so it stays cheap on every page.
 *
 * Home resolves the current edition from the URL's leading country segment,
 * falling back to the `country` preference cookie (set by /api/set-country)
 * and finally the default edition.
 */

function countryFromPath(pathname: string): CountryCode | null {
  const segment = pathname.split("/")[1];
  return segment && isValidCountry(segment) ? segment : null;
}

function countryFromCookie(): CountryCode | null {
  const match = document.cookie.match(/(?:^|;\s*)country=([^;]+)/);
  const value = match?.[1] ? decodeURIComponent(match[1]) : "";
  return isValidCountry(value) ? value : null;
}

type IconProps = React.SVGProps<SVGSVGElement>;

/* Inline 24px stroke icons (lucide-style paths) — no icon dependency. */

function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function BookmarkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();

  // Cookie is only readable client-side; resolve after mount to keep the
  // server and first client render identical (no hydration mismatch).
  const [cookieCountry, setCookieCountry] = React.useState<CountryCode | null>(null);
  React.useEffect(() => {
    setCookieCountry(countryFromCookie());
  }, []);

  const edition = countryFromPath(pathname) ?? cookieCountry ?? DEFAULT_COUNTRY;
  const homeHref = `/${edition}`;

  const items = [
    {
      key: "home",
      label: "Home",
      href: homeHref,
      icon: HomeIcon,
      isActive: pathname === "/" || pathname === homeHref,
    },
    {
      key: "search",
      label: "Search",
      href: "/search",
      icon: SearchIcon,
      isActive: pathname.startsWith("/search"),
    },
    {
      key: "bookmarks",
      label: "Saved",
      href: "/account/bookmarks",
      icon: BookmarkIcon,
      isActive: pathname.startsWith("/account/bookmarks"),
    },
    {
      key: "profile",
      label: "Profile",
      href: "/account/profile",
      icon: UserIcon,
      isActive: pathname.startsWith("/account/profile"),
    },
  ] as const;

  // Article pages are a focused reading view (News24 / BBC apps): the bar
  // would cover the lead image, and the article toolbar already has Back.
  if (isArticlePath(pathname)) return null;

  return (
    <>
      {/* Reserves the bar's height (+ safe area) at the end of the page so the
          footer is never hidden behind it; rendered only where the bar is. */}
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 md:hidden" />
      <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      <div className="flex h-16 items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="ui-sm">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
