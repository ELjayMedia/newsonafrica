// This is the service worker for News On Africa PWA

const CACHE_NAME = "news-on-africa-cache-v1"
const OFFLINE_URL = "/offline.html"

// Assets to cache
const ASSETS_TO_CACHE = ["/", "/offline.html", "/placeholder.svg", "/manifest.json", "/news-on-africa-logo.png"]

// Install event - cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache")
        return cache.addAll(ASSETS_TO_CACHE)
      })
      .catch((err) => console.error("Service worker install error:", err)),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Skip browser-sync requests
  if (event.request.url.includes("browser-sync")) {
    return
  }

  // Handle API requests differently - network first, then offline response
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: "You are offline" }), {
          headers: { "Content-Type": "application/json" },
          status: 503,
        })
      }),
    )
    return
  }

  // For HTML pages - network first, then cache, then offline page
  if (event.request.headers.get("Accept").includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest version
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            return caches.match(OFFLINE_URL)
          })
        }),
    )
    return
  }

  // For other assets - cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          // Cache the new response
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          // For images, return a placeholder
          if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
            return caches.match("/placeholder.svg")
          }
          return new Response("Network error", { status: 408 })
        })
    }),
  )
})
