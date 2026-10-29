"use client";

import { usePathname } from "next/navigation";

import { isArticlePath } from "@/lib/article/route";

/**
 * Hides site chrome (e.g. the utility bar) below md on article pages, where
 * the compact ArticleToolbar takes over. Unchanged everywhere else.
 */
export function HideOnMobileArticle({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isArticlePath(pathname) ? (
    <div className="max-md:hidden">{children}</div>
  ) : (
    <>{children}</>
  );
}
