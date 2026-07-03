/**
 * News on Africa service worker (NOA-108) — hand-rolled, no PWA plugin.
 *
 * Caching strategy:
 *  - Precache (install): offline fallback page + core brand assets.
 *  - HTML navigations: network-first; on failure serve the cached copy of
 *    the page if we have one, otherwise the offline fallback. Successful
 *    responses are cached EXCEPT for auth/account pages.
 *  - Static assets (/_next/static, /_next/image, /icons, images/fonts/css/js):
 *    stale-while-revalidate.
 *  - NEVER cached / never intercepted: non-GET requests, cross-origin
 *    requests, /api/*, auth routes (/auth, /login, /register,
 *    /forgot-password, /reset-password) and /account/* pages.
 *
 * Cache names are versioned; bump SW_VERSION for a clean slate — old caches
 * are deleted on activate. Updates use the waiting-worker pattern: the page
 * (components/service-worker-registration.tsx) shows a refresh prompt and
 * posts SKIP_WAITING when the user accepts.
 */

const SW_VERSION = "v1";
const PRECACHE = `noa-precache-${SW_VERSION}`;
const PAGE_CACHE = `noa-pages-${SW_VERSION}`;
const ASSET_CACHE = `noa-assets-${SW_VERSION}`;
const CURRENT_CACHES = [PRECACHE, PAGE_CACHE, ASSET_CACHE];

const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
];

/** Paths that must never be intercepted or cached by the service worker. */
const NETWORK_ONLY_PATTERNS = [
  /^\/api\//,
  /^\/auth(\/|$)/,
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/forgot-password(\/|$)/,
  /^\/reset-password(\/|$)/,
];

/** Personalised pages: allowed to fall back to offline.html, never cached. */
const NEVER_CACHE_PAGE_PATTERNS = [/^\/account(\/|$)/];

const STATIC_ASSET_PATTERNS = [/^\/_next\/static\//, /^\/_next\/image(\?|$)/, /^\/icons\//];
const STATIC_ASSET_EXTENSIONS = /\.(?:js|css|png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|ttf)$/;

function isNetworkOnly(pathname) {
  return NETWORK_ONLY_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isCacheablePage(pathname) {
  return (
    !isNetworkOnly(pathname) &&
    !NEVER_CACHE_PAGE_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

function isStaticAsset(url) {
  return (
    STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url.pathname + url.search)) ||
    STATIC_ASSET_EXTENSIONS.test(url.pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      cache.addAll(
        // "reload" bypasses the HTTP cache so the precache is always fresh.
        PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" })),
      ),
    ),
  );
  // No skipWaiting() here: the new worker waits until the user accepts the
  // refresh prompt (SKIP_WAITING message) so in-flight pages aren't broken.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/** Network-first for HTML navigations, with cache then offline fallback. */
async function handleNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && isCacheablePage(url.pathname)) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName: PAGE_CACHE });
    if (cached) {
      return cached;
    }
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ||
      new Response("You are offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

/** Stale-while-revalidate for static assets. */
async function handleStaticAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);

  const refresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaqueredirect") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    // Serve from cache immediately; refresh in the background.
    return cached;
  }
  const response = await refresh;
  if (response) {
    return response;
  }
  const precached = await caches.match(request, { cacheName: PRECACHE });
  if (precached) {
    return precached;
  }
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept non-GET requests (mutations, server actions, auth).
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Same-origin only; leave CDNs/analytics/Supabase to the browser.
  if (url.origin !== self.location.origin) {
    return;
  }

  // API + auth routes go straight to the network, never cached.
  if (isNetworkOnly(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  }
  // Everything else (RSC payloads, prefetches, etc.) passes through untouched.
});
