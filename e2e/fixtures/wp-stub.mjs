/**
 * Minimal WordPress API stub for Playwright smoke tests (NOA-117).
 *
 * The sandbox/CI environment has no live WordPress multisite, and the
 * Next.js server fetches WordPress content server-side (so Playwright's
 * browser-level route interception can't reach it). Instead, the Playwright
 * config points WORDPRESS_API_URL at this tiny HTTP server, which mimics the
 * slices of WordPress the smoke flows touch:
 *
 *   POST /:country/graphql                         -> WPGraphQL fixture data
 *   GET  /:country/wp-json/wp/v2/posts             -> legacy REST fixture list
 *   GET  /:country/wp-json/wp/v2/posts?slug=...    -> [] (drives 404 flows)
 *   GET  /:country/wp-json/wp/v2/{categories,tags,users} -> []
 *
 * REST remains in the stub for menu/navigation and legacy smoke compatibility,
 * but content DAL tests now exercise the same GraphQL transport used in
 * production.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.WP_STUB_PORT ?? 3101);
const POST_COUNT = 13;

function isoFor(id) {
  return new Date(Date.UTC(2026, 0, id, 12, 0, 0)).toISOString();
}

function fixturePost(id) {
  const iso = isoFor(id);
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

function fixtureGraphQLPost(id) {
  const iso = isoFor(id);
  return {
    databaseId: id,
    slug: `stub-headline-${id}`,
    status: "publish",
    date: iso,
    modified: iso,
    title: `Stub headline ${id}`,
    excerpt: `<p>Excerpt for stub headline ${id}.</p>`,
    content: `<p>Body for stub headline ${id}.</p>`,
    featuredImage: null,
    categories: {
      nodes: [{ databaseId: 10, name: "News", slug: "news" }],
    },
    tags: {
      nodes: [{ databaseId: 20, name: "Smoke", slug: "smoke" }],
    },
    author: {
      node: {
        databaseId: 1,
        name: "Test Reporter",
        slug: "test-reporter",
        avatar: null,
      },
    },
  };
}

const POSTS = Array.from({ length: POST_COUNT }, (_, i) => fixturePost(i + 1));
const GQL_POSTS = Array.from({ length: POST_COUNT }, (_, i) => fixtureGraphQLPost(i + 1));

const GQL_CATEGORIES = [{ databaseId: 10, name: "News", slug: "news", description: "", count: POST_COUNT }];
const GQL_TAGS = [{ databaseId: 20, name: "Smoke", slug: "smoke", count: POST_COUNT }];
const GQL_AUTHORS = [
  { databaseId: 1, name: "Test Reporter", slug: "test-reporter", description: "", avatar: null },
];

function sendJson(res, body, { total = 0, totalPages = 0 } = {}) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "X-WP-Total": String(total),
    "X-WP-TotalPages": String(totalPages),
  });
  res.end(JSON.stringify(body));
}

function sendGraphQL(res, data) {
  sendJson(res, { data });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function handleGraphQL(req, res) {
  readJson(req)
    .then((body) => {
      const operationName = body.operationName;
      const variables = body.variables ?? {};

      if (operationName === "PostsList") {
        const first = Number(variables.first ?? 10);
        sendGraphQL(res, {
          posts: {
            pageInfo: { hasNextPage: GQL_POSTS.length > first },
            nodes: GQL_POSTS.slice(0, first),
          },
        });
        return;
      }

      if (operationName === "PostBySlug") {
        const post = GQL_POSTS.find((item) => item.slug === variables.slug) ?? null;
        sendGraphQL(res, { post });
        return;
      }

      if (operationName === "PostById") {
        const post = GQL_POSTS.find((item) => item.databaseId === Number(variables.id)) ?? null;
        sendGraphQL(res, { post });
        return;
      }

      if (operationName === "Categories") {
        sendGraphQL(res, { categories: { pageInfo: { hasNextPage: false }, nodes: GQL_CATEGORIES } });
        return;
      }

      if (operationName === "CategoryBySlug") {
        sendGraphQL(res, { category: GQL_CATEGORIES.find((item) => item.slug === variables.slug) ?? null });
        return;
      }

      if (operationName === "CategoryById") {
        sendGraphQL(res, { category: GQL_CATEGORIES.find((item) => item.databaseId === Number(variables.id)) ?? null });
        return;
      }

      if (operationName === "Tags") {
        sendGraphQL(res, { tags: { pageInfo: { hasNextPage: false }, nodes: GQL_TAGS } });
        return;
      }

      if (operationName === "TagBySlug") {
        sendGraphQL(res, { tag: GQL_TAGS.find((item) => item.slug === variables.slug) ?? null });
        return;
      }

      if (operationName === "Authors") {
        sendGraphQL(res, { users: { pageInfo: { hasNextPage: false }, nodes: GQL_AUTHORS } });
        return;
      }

      if (operationName === "AuthorBySlug") {
        sendGraphQL(res, { user: GQL_AUTHORS.find((item) => item.slug === variables.slug) ?? null });
        return;
      }

      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ errors: [{ message: `Unhandled GraphQL operation: ${operationName ?? "unknown"}` }] }));
    })
    .catch((error) => {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ errors: [{ message: error instanceof Error ? error.message : "Invalid GraphQL request" }] }));
    });
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && url.pathname.match(/^\/[a-z]{2}\/graphql$/)) {
    sendJson(res, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname.match(/^\/[a-z]{2}\/graphql$/)) {
    handleGraphQL(req, res);
    return;
  }

  const match = url.pathname.match(/^\/([a-z]{2})\/wp-json\/wp\/v2\/([a-z]+)(?:\/(\d+))?$/);

  if (!match) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ code: "rest_no_route", message: "No route", data: { status: 404 } }));
    return;
  }

  const [, , resource, id] = match;

  if (resource === "posts") {
    if (url.searchParams.has("slug")) {
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

  sendJson(res, [], { total: 0, totalPages: 0 });
});

server.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`[wp-stub] listening on http://127.0.0.1:${PORT}`);
});
