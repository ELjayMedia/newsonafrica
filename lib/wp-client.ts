import { z } from "zod";
import { fetcher } from "./fetcher";

const REST_BASE = process.env.WORDPRESS_REST_API_URL || "https://newsonafrica.com/sz/wp-json/wp/v2";

function buildUrl(path: string, params: Record<string, any> = {}, site?: string) {
  let base = REST_BASE;
  if (site) {
    // naive multisite support: replace `/sz/` segment with site code
    base = base.replace(/\/[^/]+\//, `/${site}/`);
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.append(k, String(v));
  }
  return `${base}/${path}${qs.toString() ? `?${qs}` : ""}`;
}

// Schemas
const categorySchema = z.array(z.object({ id: z.number(), name: z.string(), slug: z.string() }));
const postSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.any(),
  excerpt: z.any().optional(),
  content: z.any().optional(),
  date: z.string().optional(),
  tags: z.array(z.number()).optional(),
});

export async function getSiteSettings(site?: string) {
  return fetcher(buildUrl("settings", { _fields: "title,description" }, site), {
    schema: z.object({ title: z.string(), description: z.string() }),
    init: { next: { revalidate: 86400 }, cache: "force-cache" },
  });
}

export async function getCategories(site?: string) {
  return fetcher(buildUrl("categories", { per_page: 100, _fields: "id,name,slug" }, site), {
    schema: categorySchema,
    init: { next: { revalidate: 86400 }, cache: "force-cache" },
  });
}

export async function getFeatured({ site }: { site?: string }) {
  return fetcher(buildUrl("posts", { sticky: true, _fields: "id,slug,title,excerpt,date" }, site), {
    schema: z.array(postSchema),
    init: { next: { revalidate: 120 }, cache: "force-cache" },
  });
}

export async function getPosts(
  { category, page = 1, perPage = 10, fields }: { category?: number | string; page?: number; perPage?: number; fields?: string },
  site?: string,
) {
  const params: Record<string, any> = {
    page,
    per_page: perPage,
    _fields: fields || "id,slug,title,excerpt,date,tags",
  };
  if (category) params.categories = category;
  return fetcher(buildUrl("posts", params, site), {
    schema: z.array(postSchema),
    init: { next: { revalidate: 120 }, cache: "force-cache" },
  });
}

export async function getPostBySlug(slug: string, { preview }: { preview?: boolean } = {}, site?: string) {
  const params: Record<string, any> = { slug, _fields: "id,slug,title,content,excerpt,date,tags" };
  if (preview) params.status = "draft";
  const posts = await fetcher(buildUrl("posts", params, site), {
    schema: z.array(postSchema),
    init: preview
      ? { cache: "no-store" }
      : { next: { revalidate: 300 }, cache: "force-cache" },
  });
  return posts[0] ?? null;
}
