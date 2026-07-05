"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { CountrySwitcher } from "@/components/country-switcher";
import { HeaderSearch } from "@/components/search-box";
import { ThemeToggle } from "@/components/theme-toggle";
import { DEFAULT_COUNTRY, isValidCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface HeaderSection {
  slug: string;
  name: string;
}

interface SiteHeaderProps {
  /** WordPress-derived nav sections (busiest categories) from the root layout. */
  sections?: HeaderSection[];
}

function SocialLink({
  label,
  path,
  children,
}: {
  label: string;
  path: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={path}
      aria-label={label}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-noa-hairline text-noa-ink transition-colors hover:border-noa-green hover:text-noa-green"
    >
      {children}
    </a>
  );
}

/** Live edition date ("Saturday, June 20"), rendered after mount to avoid a
 *  server/client hydration mismatch on the timezone-sensitive value. */
function EditionDate() {
  const [label, setLabel] = React.useState("");
  React.useEffect(() => {
    setLabel(
      new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    );
  }, []);
  return (
    <span
      suppressHydrationWarning
      className="whitespace-nowrap text-sm font-semibold text-noa-muted"
    >
      {label}
    </span>
  );
}

/**
 * Masthead + section nav (design system, Bold Punch direction with a light
 * masthead). Lives inside the floating content well: a white masthead row
 * (brand lockup, edition picker, search, socials, date, theme) over an
 * uppercase Archivo nav row whose active item carries a green underline, with a
 * green accent bar beneath as the Bold Punch signature. Collapses to a
 * hamburger disclosure below `lg`.
 */
export function SiteHeader({ sections = [] }: SiteHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  const firstSegment = pathname.split("/")[1] ?? "";
  const country = isValidCountry(firstSegment) ? firstSegment : DEFAULT_COUNTRY;

  const navLinks = [
    { href: `/${country}`, label: "Home" },
    ...sections.map((section) => ({
      href: `/${country}/category/${section.slug}`,
      label: section.name,
    })),
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-b-[3px] border-noa-green bg-noa-white">
      {/* Masthead row */}
      <div className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" aria-label="News On Africa home" className="shrink-0">
          <BrandMark />
        </Link>

        <div className="hidden flex-1 items-center gap-3 md:flex">
          <CountrySwitcher className="shrink-0" />
          <div className="min-w-0 flex-1">
            <HeaderSearch />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="hidden items-center gap-1.5 lg:flex">
            <SocialLink label="News On Africa on X" path="https://x.com">
              <span className="text-sm font-bold">𝕏</span>
            </SocialLink>
            <SocialLink label="News On Africa on Facebook" path="https://facebook.com">
              <span className="font-display text-sm font-black">f</span>
            </SocialLink>
          </div>
          <span className="mx-1 hidden h-6 w-px bg-noa-hairline lg:block" aria-hidden />
          <div className="hidden lg:block">
            <EditionDate />
          </div>
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-noa-hairline text-noa-ink lg:hidden"
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Section nav (desktop) */}
      <nav
        aria-label="Primary"
        className="hidden items-center gap-6 overflow-x-auto border-t border-noa-hairline px-4 sm:px-6 lg:flex"
      >
        {navLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "noa-eyebrow whitespace-nowrap border-b-[3px] py-3 tracking-[0.08em] transition-colors",
                active
                  ? "border-noa-green text-noa-green"
                  : "border-transparent text-noa-ink hover:text-noa-green",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile disclosure */}
      <div className={cn("border-t border-noa-hairline lg:hidden", open ? "block" : "hidden")}>
        <div className="flex flex-col gap-1 px-4 py-2 sm:px-6">
          <div className="py-2 md:hidden">
            <HeaderSearch />
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "noa-eyebrow py-2.5 tracking-[0.08em]",
                isActive(link.href) ? "text-noa-green" : "text-noa-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
          <CountrySwitcher className="mt-1" />
        </div>
      </div>
    </header>
  );
}
