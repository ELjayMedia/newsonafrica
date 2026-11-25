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
 * rail on desktop. Below `lg` the rail is hidden so mobile surfaces keep their
 * reader-first flow and do not inherit desktop ad/sidebar inventory.
 */
export function RailLayout({ children, rail, className }: RailLayoutProps) {
  if (!rail) {
    return <div className={cn("min-w-0", className)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-[12px]",
        className,
      )}
    >
      {/* Desktop: the main column is its own white panel on the grey canvas,
          semi-detached from the rail's panels (News24-style). */}
      <div className="min-w-0 lg:self-start lg:border lg:border-noa-hairline lg:bg-noa-white lg:p-8">
        {children}
      </div>
      <aside className="hidden lg:block">{rail}</aside>
    </div>
  );
}
