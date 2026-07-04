"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Container } from "@/components/ui/container";
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
  accountSlot?: React.ReactNode;
}

/**
 * Responsive navigation shell (NOA-84): brand, WordPress-driven section nav
 * (collapses to a disclosure menu on small screens), and the theme toggle.
 * Section links are edition-aware — they target the country in the current URL.
 */
export function SiteHeader({ sections = [], accountSlot }: SiteHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Resolve the active edition from the URL so section links stay in-edition.
  const firstSegment = pathname.split("/")[1] ?? "";
  const country = isValidCountry(firstSegment) ? firstSegment : DEFAULT_COUNTRY;

  const navLinks = [
    { href: `/${country}`, label: "Home" },
    ...sections.map((section) => ({
      href: `/${country}/category/${section.slug}`,
      label: section.name,
    })),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="heading-sm shrink-0 font-bold tracking-tight">
          News<span className="text-primary">on</span>Africa
        </Link>

        <nav aria-label="Primary" className="hidden min-w-0 items-center gap-5 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="ui-md whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CountrySwitcher className="hidden sm:inline-flex" />
          <HeaderSearch />
          {/* Account/profile menu (NOA-99): server-rendered slot passed in
              from the root layout, next to the theme toggle. */}
          {accountSlot}
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input lg:hidden"
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </Container>

      <div className={cn("border-t border-border lg:hidden", open ? "block" : "hidden")}>
        <Container className="flex flex-col gap-1 py-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="ui-md py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <CountrySwitcher className="mt-1 sm:hidden" />
        </Container>
      </div>
    </header>
  );
}
