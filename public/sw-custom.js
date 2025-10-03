// Custom service worker functionality for News On Africa PWA

const CACHE_NAME = "news-on-africa-v1.0.2"
const OFFLINE_URL = "/offline"

const BROADCAST_MESSAGE_TYPES = {
  ENQUEUE: "BACKGROUND_SYNC_ENQUEUE",
  REPLAYED: "BACKGROUND_SYNC_QUEUE_REPLAYED",
  ERROR: "BACKGROUND_SYNC_QUEUE_ERROR",
}

const BACKGROUND_QUEUE_CONFIG = [
  {
    name: "bookmarks-write-queue",
    match: ({ url, request }) =>
      ["POST", "PUT", "DELETE"].includes(request.method) &&
      url.origin === self.location.origin &&
      url.pathname.startsWith("/api/bookmarks"),
  },
  {
    name: "comments-write-queue",
    match: ({ url, request }) =>
      ["POST", "PUT", "DELETE", "PATCH"].includes(request.method) &&
      url.origin === self.location.origin &&
      url.pathname.startsWith("/api/comments"),
  },
  {
    name: "supabase-bookmarks-write-queue",
    match: ({ url, request }) =>
      ["POST", "PUT", "DELETE", "PATCH"].includes(request.method) &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.startsWith("/rest/v1/bookmarks"),
  },
  {
    name: "supabase-comments-write-queue",
    match: ({ url, request }) =>
      ["POST", "PUT", "DELETE", "PATCH"].includes(request.method) &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.startsWith("/rest/v1/comments"),
  },
]

const broadcastMessageToClients = async (payload) => {
  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  clientList.forEach((client) => {
    client.postMessage(payload)
  })
}

const registerBackgroundSyncRoutes = () => {
  if (!self.workbox) {
    return
  }

  const { registerRoute } = self.workbox.routing
  const { NetworkOnly } = self.workbox.strategies
  const { BackgroundSyncPlugin } = self.workbox.backgroundSync

  const registerMethods = ["POST", "PUT", "DELETE", "PATCH"]

  BACKGROUND_QUEUE_CONFIG.forEach(({ name, match }) => {
    const plugin = new BackgroundSyncPlugin(name, {
      maxRetentionTime: 24 * 60, // 24 hours
      onSync: async ({ queue }) => {
        try {
          await queue.replayRequests()
          await broadcastMessageToClients({
            type: BROADCAST_MESSAGE_TYPES.REPLAYED,
            queue: name,
            timestamp: Date.now(),
          })
        } catch (error) {
          console.error(`Background sync replay failed for ${name}:`, error)
          await broadcastMessageToClients({
            type: BROADCAST_MESSAGE_TYPES.ERROR,
            queue: name,
            error: error?.message || "Unknown error",
          })
          throw error
        }
      },
    })

    const originalFetchDidFail = plugin.fetchDidFail.bind(plugin)
    plugin.fetchDidFail = async (options) => {
      await originalFetchDidFail(options)
      await broadcastMessageToClients({
        type: BROADCAST_MESSAGE_TYPES.ENQUEUE,
        queue: name,
        url: options.request.url,
        method: options.request.method,
        timestamp: Date.now(),
      })
    }

    registerMethods.forEach((method) => {
      registerRoute(match, new NetworkOnly({ plugins: [plugin] }), method)
    })
  })
}

registerBackgroundSyncRoutes()

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
