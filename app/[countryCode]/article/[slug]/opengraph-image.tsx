/**
 * Per-article Open Graph image (NOA-115): social crawlers hit this route for
 * article link previews. Prefer the article's featured image so shares render
 * with the story photo; fall back to the branded card when the story or image
 * cannot be loaded. Shared fallback markup lives in `lib/seo/og-card.tsx`; the
 * site-wide default is `app/opengraph-image.tsx`.
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

const MAX_EMBEDDED_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 5000;

interface FeaturedImageCardProps {
  imageUrl: string;
  eyebrow?: string;
}

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function loadImageDataUrl(src: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(src, {
      cache: "force-cache",
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_EMBEDDED_IMAGE_BYTES) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_EMBEDDED_IMAGE_BYTES) return null;

    return `data:${contentType};base64,${encodeBase64(buffer)}`;
  } catch (error) {
    console.error(`[og-image] failed to load featured image ${src}`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function FeaturedImageCard({ imageUrl, eyebrow }: FeaturedImageCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "#090f0c",
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og requires plain img elements. */}
      <img
        src={imageUrl}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundColor: "rgba(0, 0, 0, 0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 42,
          top: 36,
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderRadius: 18,
          backgroundColor: "rgba(5, 12, 9, 0.82)",
          padding: "14px 18px",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#06120b",
            fontSize: 23,
            fontWeight: 800,
          }}
        >
          N
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {SITE_NAME}
        </div>
      </div>
      {eyebrow ? (
        <div
          style={{
            position: "absolute",
            left: 42,
            bottom: 38,
            display: "flex",
            borderRadius: 999,
            backgroundColor: "rgba(5, 12, 9, 0.78)",
            color: "#ffffff",
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: 1.6,
            padding: "13px 18px",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
      ) : null}
    </div>
  );
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
        const eyebrow = section ? `${country} · ${section}` : country;
        const featuredImage = post.featuredImage?.url
          ? await loadImageDataUrl(post.featuredImage.url)
          : null;

        card = featuredImage ? (
          <FeaturedImageCard imageUrl={featuredImage} eyebrow={eyebrow} />
        ) : (
          <OgCard title={truncateOgTitle(post.title)} eyebrow={eyebrow} />
        );
      }
    } catch (error) {
      console.error(`[og-image] failed to load post ${countryCode}/${slug}`, error);
    }
  }

  return new ImageResponse(card, size);
}
