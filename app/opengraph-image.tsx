/**
 * Default site-wide Open Graph image (NOA-115), applied to every route
 * without a closer `opengraph-image` (home, country feeds, category/tag/
 * author pages, search). Article pages get their own branded card from
 * `app/[countryCode]/article/[slug]/opengraph-image.tsx`.
 */
import { ImageResponse } from "next/og";

import { DEFAULT_OG_TITLE, OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, OgCard } from "@/lib/seo/og-card";
import { SITE_NAME } from "@/lib/seo/config";

export const alt = SITE_NAME;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(<OgCard title={DEFAULT_OG_TITLE} />, size);
}
