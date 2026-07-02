/**
 * WordPress webhook (NOA-88): on publish/update/delete, revalidate the
 * relevant Next.js fetch-cache tags and sync the content index.
 *
 * WordPress should call this via a plugin (e.g. a `save_post` /
 * `before_delete_post` hook posting JSON) with:
 *   { "action": "post_published" | "post_updated" | "post_deleted" | "category_updated",
 *     "country": "sz" | "za" | "ng",
 *     "post": { "id": number, "slug": string, "categorySlugs"?: string[], "tagSlugs"?: string[] } }
 *
 * Auth: either header `x-webhook-secret: <WORDPRESS_WEBHOOK_SECRET>`, or an
 * HMAC-SHA256 signature of the raw body in `x-wp-signature: sha256=<hex>`
 * (optionally prefixed `sha256=`), keyed with the same secret.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { cacheTags } from "@/lib/wordpress/cache-tags";
import { isValidCountry, SUPPORTED_COUNTRY_CODES } from "@/lib/wordpress/countries";
import { deletePostFromIndex, syncPostById } from "@/lib/content-sync/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WordPressWebhookPost {
  id?: number | string;
  slug?: string;
  categorySlugs?: string[];
  tagSlugs?: string[];
  authorSlug?: string;
}

interface WordPressWebhookPayload {
  action?: "post_published" | "post_updated" | "post_deleted" | "category_updated" | "tag_updated" | string;
  country?: string;
  post?: WordPressWebhookPost;
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function verifySignature(rawBody: string, signatureHeader: string): boolean {
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  const expected = createHmac("sha256", serverEnv.WORDPRESS_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqual(provided, expected);
}

function isAuthorized(request: NextRequest, rawBody: string): boolean {
  const secretHeader = request.headers.get("x-webhook-secret")?.trim();
  if (secretHeader) {
    return safeEqual(secretHeader, serverEnv.WORDPRESS_WEBHOOK_SECRET);
  }

  const signatureHeader = request.headers.get("x-wp-signature")?.trim();
  if (signatureHeader) {
    return verifySignature(rawBody, signatureHeader);
  }

  return false;
}

function normalizeCountry(country: string | undefined): string[] {
  if (country && isValidCountry(country.trim().toLowerCase())) {
    return [country.trim().toLowerCase()];
  }
  // Unknown/missing country: be conservative and revalidate every edition
  // rather than silently leaving stale pages cached.
  return Array.from(SUPPORTED_COUNTRY_CODES);
}

/**
 * Revalidate every fetch-cache tag a changed post could affect, across the
 * resolved countries. See docs/caching-strategy.md for what each tag covers.
 */
function revalidatePost(countries: string[], post: WordPressWebhookPost) {
  const postId = post.id !== undefined ? String(post.id) : undefined;
  const tags = new Set<string>();

  for (const country of countries) {
    tags.add(cacheTags.country(country));
    tags.add(cacheTags.home(country));
    tags.add(cacheTags.posts(country));

    if (postId) tags.add(cacheTags.post(country, postId));
    if (post.slug) tags.add(cacheTags.postSlug(country, post.slug));

    for (const slug of post.categorySlugs ?? []) {
      tags.add(cacheTags.category(country, slug));
    }
    for (const slug of post.tagSlugs ?? []) {
      tags.add(cacheTags.tag(country, slug));
    }
    if (post.authorSlug) tags.add(cacheTags.author(country, post.authorSlug));
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return Array.from(tags);
}

function revalidateTaxonomy(countries: string[], kind: "category" | "tag", slug: string | undefined) {
  if (!slug) return [];

  const tags = countries.map((country) => (kind === "category" ? cacheTags.category(country, slug) : cacheTags.tag(country, slug)));
  for (const tag of tags) revalidateTag(tag);
  return tags;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!isAuthorized(request, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WordPressWebhookPayload;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as WordPressWebhookPayload) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, post } = payload;
  const countries = normalizeCountry(payload.country);
  // Content sync targets a single country's WordPress instance — pick the
  // resolved one when known, otherwise the default (webhooks should always
  // include `country`; this only matters for the conservative fallback).
  const syncCountry = countries[0]!;

  switch (action) {
    case "post_published":
    case "post_updated": {
      if (!post?.slug || post.id === undefined) {
        return NextResponse.json({ error: "post_published/post_updated requires post.id and post.slug" }, { status: 400 });
      }

      const wpPostId = typeof post.id === "number" ? post.id : Number.parseInt(post.id, 10);
      const syncResult = Number.isFinite(wpPostId) ? await syncPostById(syncCountry, wpPostId) : { success: false, error: "invalid post id" };
      const revalidated = revalidatePost(countries, post);

      return NextResponse.json({ success: true, action, revalidated, sync: syncResult });
    }

    case "post_deleted": {
      if (!post?.slug || post.id === undefined) {
        return NextResponse.json({ error: "post_deleted requires post.id and post.slug" }, { status: 400 });
      }

      const wpPostId = typeof post.id === "number" ? post.id : Number.parseInt(post.id, 10);
      const syncResult = Number.isFinite(wpPostId) ? await deletePostFromIndex(syncCountry, wpPostId) : { success: false, error: "invalid post id" };
      const revalidated = revalidatePost(countries, post);

      return NextResponse.json({ success: true, action, revalidated, sync: syncResult });
    }

    case "category_updated": {
      const revalidated = revalidateTaxonomy(countries, "category", post?.slug);
      return NextResponse.json({ success: true, action, revalidated });
    }

    case "tag_updated": {
      const revalidated = revalidateTaxonomy(countries, "tag", post?.slug);
      return NextResponse.json({ success: true, action, revalidated });
    }

    default:
      return NextResponse.json({ error: `Unhandled action: ${String(action)}` }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "WordPress webhook endpoint is active", timestamp: new Date().toISOString() });
}
