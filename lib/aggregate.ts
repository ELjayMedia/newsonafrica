import { getLatestPosts, type WpPost } from "./wp";

export async function getAfricanHomeFeed() {
  // MVP: only SZ + ZA; extend later.
  const [sz, za] = await Promise.all([
    getLatestPosts("sz", 12).catch(() => [] as WpPost[]),
    getLatestPosts("za", 12).catch(() => [] as WpPost[]),
  ]);

  const merged = dedupePosts([...sz, ...za]);
  const hero = merged[0] ? [merged[0]] : [];
  const secondary = merged.slice(1, 5);
  const remainder = merged.slice(5);
  return { hero, secondary, remainder };
}

function dedupePosts(posts: WpPost[]) {
  const seen = new Set<string>();
  const out: WpPost[] = [];
  for (const p of posts) {
    const key = p.slug || String(p.id);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}
