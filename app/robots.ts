import type { MetadataRoute } from "next";

import { absoluteUrl, getBaseUrl } from "@/lib/seo/config";

/**
 * robots.txt (NOA-112), served at `/robots.txt` by the Next metadata-route
 * convention. Public reading surfaces (`/{country}`, article/category/tag/
 * author pages, `/search`) stay crawlable; account, API and auth pages are
 * excluded. Crawlers discover everything else through the sitemap index
 * (`app/sitemap.xml/route.ts`), which also links the per-country Google
 * News sitemaps (NOA-113).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account/",
          "/auth/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getBaseUrl(),
  };
}
