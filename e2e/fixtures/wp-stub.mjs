/**
 * Minimal WordPress REST API stub for Playwright smoke tests (NOA-117).
 *
 * The sandbox/CI environment has no live WordPress multisite, and the
 * Next.js server fetches WordPress content server-side (so Playwright's
 * browser-level route interception can't reach it). Instead, the Playwright
 * config points WORDPRESS_API_URL at this tiny HTTP server, which mimics
 * exactly the slices of the WP REST v2 surface the smoke flows touch:
 *
 *   GET /:country/wp-json/wp/v2/posts             -> fixture post list
 *   GET /:country/wp-json/wp/v2/posts?slug=...    -> [] (drives 404 flows)
 *   GET /:country/wp-json/wp/v2/{categories,tags,users} -> []
 *
 * Responses carry the X-WP-Total / X-WP-TotalPages pagination headers the
 * REST client (lib/wordpress/rest-client.ts) parses. Everything else 404s.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.WP_STUB_PORT ?? 3101);

/** Slug the article-404 spec requests; the stub knows no posts by slug. */
const POST_COUNT = 13;

function fixturePost(id) {
  const iso = new Date(Date.UTC(2026, 0, id, 12, 0, 0)).toISOString();
  return {
    id,
    slug: `stub-headline-${id}`,
    status: "publish",
    date: iso,
    modified: iso,
    title: { rendered: `Stub headline ${id}` },
    excerpt: { rendered: `<p>Excerpt for stub headline ${id}.</p>` },
    content: { rendered: `<p>Body for stub headline ${id}.</p>` },
    _embedded: {
      author: [{ id: 1, name: "Test Reporter", slug: "test-reporter" }],
      "wp:term": [
        [{ id: 10, name: "News", slug: "news", taxonomy: "category" }],
        [{ id: 20, name: "Smoke", slug: "smoke", taxonomy: "post_tag" }],
      ],
    },
  };
}

const POSTS = Array.from({ length: POST_COUNT }, (_, i) => fixturePost(i + 1));

function sendJson(res, body, { total = 0, totalPages = 0 } = {}) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "X-WP-Total": String(total),
    "X-WP-TotalPages": String(totalPages),
  });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const match = url.pathname.match(/^\/([a-z]{2})\/wp-json\/wp\/v2\/([a-z]+)(?:\/(\d+))?$/);

  if (!match) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ code: "rest_no_route", message: "No route", data: { status: 404 } }));
    return;
  }

  const [, , resource, id] = match;

  if (resource === "posts") {
    if (url.searchParams.has("slug")) {
      // Article pages look posts up by slug; the stub has none, which drives
      // the not-found flow the article-404 spec asserts.
      sendJson(res, [], { total: 0, totalPages: 0 });
      return;
    }
    if (id) {
      const post = POSTS.find((p) => p.id === Number(id));
      if (!post) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: "rest_post_invalid_id", message: "Invalid post ID.", data: { status: 404 } }));
        return;
      }
      sendJson(res, post);
      return;
    }
    const perPage = Number(url.searchParams.get("per_page") ?? 10);
    const page = Number(url.searchParams.get("page") ?? 1);
    const start = (page - 1) * perPage;
    const items = POSTS.slice(start, start + perPage);
    sendJson(res, items, { total: POSTS.length, totalPages: Math.ceil(POSTS.length / perPage) });
    return;
  }

  // Term/user lookups (categories, tags, users): empty collections are a
  // valid WP answer and let listing pages short-circuit gracefully.
  sendJson(res, [], { total: 0, totalPages: 0 });
});

server.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`[wp-stub] listening on http://127.0.0.1:${PORT}`);
});
