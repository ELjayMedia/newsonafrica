"use client";

import * as React from "react";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { CountrySwitcher } from "@/components/country-switcher";
import { HeaderSearch } from "@/components/search-box";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/design-system", label: "Design System" },
] as const;

/**
 * Responsive navigation shell (NOA-84): brand, primary nav (collapses to a
 * disclosure menu on small screens), and the theme toggle.
 */
export function SiteHeader({ accountSlot }: { accountSlot?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="heading-sm font-bold tracking-tight">
          News<span className="text-primary">on</span>Africa
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="ui-md text-muted-foreground transition-colors hover:text-foreground"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input md:hidden"
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </Container>

      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <Container className="flex flex-col gap-2 py-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="ui-md py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <CountrySwitcher className="sm:hidden" />
        </Container>
      </div>
    </header>
  );
}
