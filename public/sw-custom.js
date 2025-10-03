// Custom service worker functionality for News On Africa PWA

const CACHE_NAME = "news-on-africa-v1.0.2"
const OFFLINE_URL = "/offline"

// Background sync for news updates
self.addEventListener("sync", (event) => {
  if (event.tag === "background-news-sync") {
    event.waitUntil(syncNewsContent())
  }
})

// Push notification handling
self.addEventListener("push", (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    image: data.image,
    data: {
      url: data.url,
      timestamp: Date.now(),
    },
    actions: [
      {
        action: "read",
        title: "Read Article",
        icon: "/icon-read.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/icon-dismiss.png",
      },
    ],
    requireInteraction: true,
    tag: "news-notification",
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "read" && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  } else if (event.action === "dismiss") {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(clients.openWindow("/"))
  }
})

// Background sync function
async function syncNewsContent() {
  try {
    // Dispatch event to notify the app
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC_START",
        })
      })
    })

    // Fetch latest news from multiple endpoints
    const endpoints = ["/api/posts/latest", "/api/posts/featured", "/api/categories"]

    const promises = endpoints.map((endpoint) =>
      fetch(endpoint)
        .then((response) => {
          if (response.ok) {
            return caches.open(CACHE_NAME).then((cache) => {
              return cache.put(endpoint, response.clone())
            })
          }
        })
        .catch((error) => {
          console.error(`Failed to sync ${endpoint}:`, error)
        }),
    )

    await Promise.allSettled(promises)

    // Notify the app that sync is complete
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC_COMPLETE",
          timestamp: Date.now(),
        })
      })
    })
  } catch (error) {
    console.error("Background sync failed:", error)
  }
}

// Message handling from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "MANUAL_SYNC") {
    event.waitUntil(syncNewsContent())
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/", "/offline", "/manifest.json", "/icon-192x192.png", "/icon-512x512.png"])
    }),
  )
})

// Activate event
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
})
