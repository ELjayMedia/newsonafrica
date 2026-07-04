import * as React from "react";

import { cn } from "@/lib/utils";

interface RailLayoutProps {
  /** Main content column. */
  children: React.ReactNode;
  /** Right-rail content (most-read, ads, related). Omit for a plain single column. */
  rail?: React.ReactNode;
  className?: string;
}

/**
 * Standard content-page layout: a fluid main column beside a fixed 320px right
 * rail on desktop, collapsing to a single column (rail stacked underneath) on
 * mobile/tablet. The rail is sticky on large screens so it stays in view as the
 * main column scrolls, which keeps long article/listing pages from leaving big
 * empty margins on wide desktops.
 *
 * Splits at `lg` (1024px) — below that the bottom tab bar is the primary nav and
 * the page reads as a single column.
 */
export function RailLayout({ children, rail, className }: RailLayoutProps) {
  if (!rail) {
    return <div className={cn("min-w-0", className)}>{children}</div>;
  }

  return (
    <div className={cn("grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]", className)}>
      <div className="min-w-0">{children}</div>
      <aside className="lg:sticky lg:top-20 lg:self-start">{rail}</aside>
    </div>
  );
}
