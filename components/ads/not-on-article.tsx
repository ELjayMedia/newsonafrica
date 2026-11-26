"use client";

import { usePathname } from "next/navigation";

import { isHomeRoute } from "@/lib/ads/routes";
import { isArticlePath } from "@/lib/article/route";

/**
 * Renders its children everywhere except article pages. Used for ad zones that
 * must not even be requested there (a CSS-hidden zone would still count an
 * impression).
 */
export function NotOnArticle({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isArticlePath(pathname) ? null : <>{children}</>;
}

/**
 * Renders its children everywhere except the home routes, which lead with the
 * billboard instead (one top unit per page, never leaderboard + billboard).
 */
export function NotOnHome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isHomeRoute(pathname) ? null : <>{children}</>;
}
