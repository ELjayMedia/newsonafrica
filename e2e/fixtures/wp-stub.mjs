/**
 * Minimal WPGraphQL stub for Playwright smoke tests (NOA-117).
 *
 * The sandbox/CI environment has no live WordPress multisite, and the Next.js
 * server fetches content server-side (so Playwright's browser-level route
 * interception can't reach it). The Playwright config points WORDPRESS_API_URL
 * at this tiny HTTP server, which answers the WPGraphQL surface the smoke flows
 * touch, at:
 *
 *   POST /:country/graphql
 *
 * It recognises operations by the fields present in the query string:
 *   - `posts(` list  -> fixture post nodes (empty when a tag filter like `fp`
 *     is applied, so the home hero falls back to the latest feed)
 *   - `post(`  single -> null (drives the article-404 flow)
 *   - `categories(` / `tags(` / `users(` -> empty collections
 *
 * Responses use the offset-pagination shape the DAL reads
 * (`pageInfo.offsetPagination.total`). Everything else 404s.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.WP_STUB_PORT ?? 3101);
const POST_COUNT = 13;

function fixturePostNode(id) {
  const iso = new Date(Date.UTC(2026, 0, id, 12, 0, 0)).toISOString();
  return {
    databaseId: id,
    id: Buffer.from(`post:${id}`).toString("base64"),
    slug: `stub-headline-${id}`,
    date: iso,
    modified: iso,
    status: "publish",
    title: `Stub headline ${id}`,
    excerpt: `<p>Excerpt for stub headline ${id}.</p>`,
    content: `<p>Body for stub headline ${id}.</p>`,
    featuredImage: null,
    categories: { nodes: [{ databaseId: 10, name: "News", slug: "news" }] },
    tags: { nodes: [{ databaseId: 20, name: "Smoke", slug: "smoke" }] },
    author: { node: { databaseId: 1, name: "Test Reporter", slug: "test-reporter", avatar: { url: null } } },
  };
}

// Ordered by id so the home hero resolves to "Stub headline 1".
const POST_NODES = Array.from({ length: POST_COUNT }, (_, i) => fixturePostNode(i + 1));

function sendJson(res, data) {
  const body = JSON.stringify({ data });
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function postsConnection(variables) {
  // A tag/category/author/search filter on the smoke fixtures yields nothing,
  // which lets the home feed exercise its "no featured posts" fallback path.
  const hasFilter =
    (Array.isArray(variables?.tagSlugs) && variables.tagSlugs.length > 0) ||
    Boolean(variables?.categoryName) ||
    Boolean(variables?.authorName) ||
    Boolean(variables?.search);

  if (hasFilter) {
    return { pageInfo: { offsetPagination: { total: 0 } }, nodes: [] };
  }

  const size = Number(variables?.size ?? POST_COUNT);
  const offset = Number(variables?.offset ?? 0);
  return {
    pageInfo: { offsetPagination: { total: POST_NODES.length } },
    nodes: POST_NODES.slice(offset, offset + size),
  };
}

function resolveGraphQL(query, variables) {
  // Single post lookup (by slug or database id): the stub knows no posts, which
  // drives the not-found flow the article specs assert.
  if (/\bpost\s*\(/.test(query)) return { post: null };
  if (/\bposts\s*\(/.test(query)) return { posts: postsConnection(variables) };
  if (/\bcategories\s*\(/.test(query)) return { categories: { pageInfo: { offsetPagination: { total: 0 } }, nodes: [] } };
  if (/\btags\s*\(/.test(query)) return { tags: { pageInfo: { offsetPagination: { total: 0 } }, nodes: [] } };
  if (/\busers\s*\(/.test(query)) return { users: { pageInfo: { offsetPagination: { total: 0 } }, nodes: [] } };
  if (/\bcategory\s*\(/.test(query)) return { category: null };
  if (/\buser\s*\(/.test(query)) return { user: null };
  return {};
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  // Readiness probe for Playwright's webServer.
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  const isGraphQL = req.method === "POST" && /^\/[a-z]{2}\/graphql\/?$/.test(url.pathname);

  if (!isGraphQL) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ errors: [{ message: "No route" }] }));
    return;
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
  });
  req.on("end", () => {
    let query = "";
    let variables = {};
    try {
      const parsed = JSON.parse(raw || "{}");
      query = String(parsed.query ?? "");
      variables = parsed.variables ?? {};
    } catch {
      /* empty body -> empty operation */
    }
    sendJson(res, resolveGraphQL(query, variables));
  });
});

server.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`[wp-stub] WPGraphQL stub listening on http://127.0.0.1:${PORT}`);
});
