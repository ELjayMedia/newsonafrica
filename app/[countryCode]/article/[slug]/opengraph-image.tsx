/**
 * Per-article Open Graph image (NOA-115): a branded card (brand green,
 * headline, country · section eyebrow, site name) rendered with next/og.
 * Shared markup lives in `lib/seo/og-card.tsx`; the site-wide default is
 * `app/opengraph-image.tsx`.
 *
 * Degrades gracefully: when the post can't be loaded (unknown slug or the
 * CMS is unreachable) it falls back to the default site card instead of
 * failing the request.
 */
import { ImageResponse } from "next/og";

import { COUNTRIES } from "@/lib/countries";
import { getPostBySlug, isValidCountry } from "@/lib/dal";
import { SITE_NAME } from "@/lib/seo/config";
import {
  DEFAULT_OG_TITLE,
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
  OgCard,
  truncateOgTitle,
} from "@/lib/seo/og-card";

export const alt = SITE_NAME;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

interface ImageProps {
  params: Promise<{ countryCode: string; slug: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { countryCode, slug } = await params;

  let card = <OgCard title={DEFAULT_OG_TITLE} />;

  if (isValidCountry(countryCode)) {
    try {
      const post = await getPostBySlug(countryCode, slug);
      if (post) {
        const section = post.categories[0]?.name;
        const country = COUNTRIES[countryCode].name;
        card = (
          <OgCard
            title={truncateOgTitle(post.title)}
            eyebrow={section ? `${country} · ${section}` : country}
          />
        );
      }
    } catch (error) {
      console.error(`[og-image] failed to load post ${countryCode}/${slug}`, error);
    }
  }

  return new ImageResponse(card, size);
}
