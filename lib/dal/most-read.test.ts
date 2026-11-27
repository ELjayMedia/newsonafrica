import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.fn();
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({ rpc }) }));

const getExistingPostSlugs = vi.fn();
vi.mock("@/lib/dal/posts", () => ({
  getExistingPostSlugs: (...args: unknown[]) => getExistingPostSlugs(...args),
}));

import { getMostReadPosts } from "@/lib/dal/most-read";

const row = (slug: string) => ({
  id: slug,
  wp_post_id: 1,
  slug,
  edition_code: "sz",
  title: slug,
  excerpt: null,
  url_path: `/old/${slug}`,
  featured_image_url: null,
  published_at: "2026-11-01T00:00:00Z",
});

describe("getMostReadPosts", () => {
  beforeEach(() => {
    rpc.mockReset();
    getExistingPostSlugs.mockReset();
  });

  it("drops stories the CMS no longer has and links by edition + slug", async () => {
    rpc.mockResolvedValue({ data: ["lost-1", "a", "lost-2", "b", "c"].map(row), error: null });
    getExistingPostSlugs.mockResolvedValue(new Set(["a", "b", "c"]));

    const posts = await getMostReadPosts("sz", 2);

    expect(rpc).toHaveBeenCalledWith("most_read_content", { country_filter: "sz", limit_count: 6 });
    expect(posts.map((p) => p.slug)).toEqual(["a", "b"]);
    expect(posts[0]!.url).toBe("/sz/article/a");
  });

  it("hides the module rather than linking blind when the CMS check fails", async () => {
    rpc.mockResolvedValue({ data: [row("a")], error: null });
    getExistingPostSlugs.mockRejectedValue(new Error("cms down"));

    await expect(getMostReadPosts("sz", 6)).resolves.toEqual([]);
  });
});
