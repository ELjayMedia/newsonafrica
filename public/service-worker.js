// Service Worker for News On Africa PWA
const CACHE_NAME = "news-on-africa-v1.0.1"

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/placeholder.svg",
]

// Install event - precache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache")
        return cache.addAll(PRECACHE_ASSETS)
      })
      .then(() => self.skipWaiting()),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Helper function to determine if a request is an API call
const isApiRequest = (url) => {
  return url.pathname.startsWith("/api/")
}

// Helper function to determine if a request is for an image
const isImageRequest = (url) => {
  return /\.(jpe?g|png|gif|svg|webp)$/i.test(url.pathname)
}

// Helper function to determine if a request is for a static asset
const isStaticAsset = (url) => {
  return /\.(css|js|woff2?|ttf|otf)$/i.test(url.pathname)
}

// Fetch event - network first for API, cache first for static assets, stale-while-revalidate for content
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  const url = new URL(event.request.url)

  // Network-first strategy for API requests
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            // Only cache successful responses
            if (response.status === 200) {
              cache.put(event.request, responseToCache)
            }
          })

          return response
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request)
        }),
    )
    return
  }

  // Cache-first strategy for static assets and images
  if (isStaticAsset(url) || isImageRequest(url)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached response if found
        if (response) {
          // Fetch in background to update cache
          fetch(event.request)
            .then((freshResponse) => {
              if (freshResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, freshResponse))
              }
            })
            .catch(() => {})

          return response
        }

        // If not in cache, fetch from network
        return fetch(event.request).then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            if (response.status === 200) {
              cache.put(event.request, responseToCache)
            }
          })

          return response
        })
      }),
    )
    return
  }

  // Stale-while-revalidate for all other requests (HTML content)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch from network in the background
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Update the cache with the new response
          caches.open(CACHE_NAME).then((cache) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone())
            }
          })

          return networkResponse
        })
        .catch(() => {
          // If both cache and network fail, show offline page for HTML requests
          if (event.request.headers.get("Accept").includes("text/html")) {
            return caches.match("/offline.html")
          }

          // For other types of requests, just propagate the error
          throw new Error("Network and cache both failed")
        })

      // Return the cached response immediately if available, otherwise wait for the network
      return cachedResponse || fetchPromise
    }),
  )
})

// Background sync for offline form submissions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-comments") {
    event.waitUntil(syncComments())
  } else if (event.tag === "sync-bookmarks") {
    event.waitUntil(syncBookmarks())
  }
})

// Push notification event handler
self.addEventListener("push", (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()

    const options = {
      body: data.body,
      icon: "/icon-192x192.png",
      badge: "/favicon.ico",
      data: {
        url: data.url || "/",
      },
    }

    event.waitUntil(self.registration.showNotification(data.title, options))
  } catch (error) {
    console.error("Error showing notification:", error)
  }
})

// Notification click event handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === event.notification.data.url && "focus" in client) {
          return client.focus()
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url)
      }
    }),
  )
})

// Helper function to sync comments when back online
async function syncComments() {
  try {
    const cache = await caches.open("comments-sync")
    const requests = await cache.keys()

    const syncPromises = requests.map(async (request) => {
      const response = await cache.match(request)
      const commentData = await response.json()

      try {
        const serverResponse = await fetch("/api/comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(commentData),
        })

        if (serverResponse.ok) {
          return cache.delete(request)
        }
      } catch (error) {
        console.error("Failed to sync comment:", error)
      }
    })

    await Promise.all(syncPromises)
  } catch (error) {
    console.error("Error syncing comments:", error)
  }
}

// Helper function to sync bookmarks when back online
async function syncBookmarks() {
  try {
    const cache = await caches.open("bookmarks-sync")
    const requests = await cache.keys()

    const syncPromises = requests.map(async (request) => {
      const response = await cache.match(request)
      const bookmarkData = await response.json()

      try {
        const serverResponse = await fetch("/api/bookmarks", {
          method: bookmarkData.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookmarkData.data),
        })

        if (serverResponse.ok) {
          return cache.delete(request)
        }
      } catch (error) {
        console.error("Failed to sync bookmark:", error)
      }
    })

    await Promise.all(syncPromises)
  } catch (error) {
    console.error("Error syncing bookmarks:", error)
  }
}
