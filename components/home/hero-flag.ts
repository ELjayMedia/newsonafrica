import type { PostSummary } from "@/lib/dal/types";

/** Newsroom can flag a lead story as live/breaking via a WordPress tag. */
const BREAKING_TAGS = new Set(["breaking", "live", "breaking-news"]);

/** "LIVE" / "BREAKING" label for a lead story, from its WordPress tags. */
export function heroFlag(post: PostSummary): "LIVE" | "BREAKING" | null {
  for (const tag of post.tags) {
    const slug = tag.slug.toLowerCase();
    if (slug === "live") return "LIVE";
    if (BREAKING_TAGS.has(slug)) return "BREAKING";
  }
  return null;
}
