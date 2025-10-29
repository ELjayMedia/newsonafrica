const BOOKMARK_QUEUE_NAME = "bookmarks-write-queue"
const BOOKMARK_SYNC_TAG = "bookmarks-write-queue-sync"
const DB_NAME = "bookmark-sync-db"
const DB_VERSION = 1
const STORE_NAME = "queue"
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])
let replayInProgress = false

function isOnline() {
  if (typeof self.navigator === "undefined") {
    return true
  }

  if (typeof self.navigator.onLine === "boolean") {
    return self.navigator.onLine
  }

  return true
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

function withStore(mode, callback) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        let result

        tx.oncomplete = () => {
          db.close()
          resolve(result)
        }

        tx.onerror = () => {
          const error = tx.error || new Error("IndexedDB transaction failed")
          db.close()
          reject(error)
        }

        try {
          result = callback(store)
        } catch (error) {
          db.close()
          reject(error)
        }
      }),
  )
}

function bufferToBase64(buffer) {
  let binary = ""
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function serializeRequest(request) {
  const headers = {}
  for (const [key, value] of request.headers.entries()) {
    headers[key] = value
  }

  const serialized = {
    queue: BOOKMARK_QUEUE_NAME,
    url: request.url,
    method: request.method,
    headers,
    timestamp: Date.now(),
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    hasBody: false,
    body: null,
  }

  if (MUTATION_METHODS.has(request.method.toUpperCase())) {
    const cloned = request.clone()
    const arrayBuffer = await cloned.arrayBuffer()
    serialized.hasBody = true
    serialized.body = arrayBuffer.byteLength ? bufferToBase64(arrayBuffer) : ""
  }

  return serialized
}

async function addToQueue(entry) {
  return withStore("readwrite", (store) => {
    store.add(entry)
  })
}

async function readQueue() {
  return withStore("readonly", (store) => store.getAll())
}

async function removeFromQueue(id) {
  return withStore("readwrite", (store) => {
    store.delete(id)
  })
}

async function notifyClients(type, extra = {}) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" })
  for (const client of clients) {
    client.postMessage({ type, queue: BOOKMARK_QUEUE_NAME, ...extra })
  }
}

async function enqueueRequest(request) {
  const entry = await serializeRequest(request)
  await addToQueue(entry)
  await notifyClients("BACKGROUND_SYNC_ENQUEUE")

  if (self.registration.sync && typeof self.registration.sync.register === "function") {
    try {
      await self.registration.sync.register(BOOKMARK_SYNC_TAG)
      return
    } catch (error) {
      console.warn("Failed to register background sync", error)
    }
  }

  // Fallback: attempt replay soon when sync isn't available
  setTimeout(() => {
    replayQueue().catch((error) => {
      console.warn("Background sync fallback replay failed", error)
    })
  }, 5000)
}

function shouldHandleRequest(request) {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) {
    return false
  }

  if (request.headers.get("x-sw-background-sync") === "1") {
    return false
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return false
  }

  if (url.pathname.startsWith("/api/bookmarks")) {
    return true
  }

  const actionHeader = request.headers.get("next-action") || ""
  if (actionHeader.toLowerCase().includes("bookmarks")) {
    return true
  }

  return false
}

function isNetworkError(error) {
  if (!error) return false
  if (error instanceof TypeError) return true
  const message = typeof error === "string" ? error : error.message
  return Boolean(message && message.includes("Failed to fetch"))
}

async function replayQueue() {
  if (replayInProgress) {
    return
  }

  if (!isOnline()) {
    return
  }

  replayInProgress = true
  try {
    const entries = await readQueue()
    if (!entries || entries.length === 0) {
      return
    }

    let encounteredError = null

    for (const entry of entries) {
      const headers = new Headers(entry.headers || {})
      headers.set("x-sw-background-sync", "1")

      const init = {
        method: entry.method,
        headers,
        credentials: entry.credentials || "include",
      }

      if (entry.mode) {
        init.mode = entry.mode
      }
      if (entry.cache) {
        init.cache = entry.cache
      }
      if (entry.redirect) {
        init.redirect = entry.redirect
      }
      if (entry.referrer && entry.referrer !== "about:client") {
        init.referrer = entry.referrer
      }
      if (entry.referrerPolicy) {
        init.referrerPolicy = entry.referrerPolicy
      }

      if (entry.hasBody) {
        init.body = entry.body ? base64ToUint8Array(entry.body) : new Uint8Array()
      }

      try {
        const response = await fetch(entry.url, init)
        if (!response.ok) {
          const errorMessage = `Sync request failed with status ${response.status}`
          encounteredError = new Error(errorMessage)
        }
        if (typeof entry.id !== "undefined") {
          await removeFromQueue(entry.id)
        }

        if (encounteredError) {
          break
        }
      } catch (error) {
        if (isNetworkError(error)) {
          encounteredError = error
          break
        }

        if (typeof entry.id !== "undefined") {
          await removeFromQueue(entry.id)
        }
        encounteredError = error instanceof Error ? error : new Error(String(error))
      }
    }

    if (encounteredError) {
      await notifyClients("BACKGROUND_SYNC_QUEUE_ERROR", {
        error: encounteredError.message || "Background sync failed",
      })
      throw encounteredError
    }

    await notifyClients("BACKGROUND_SYNC_QUEUE_REPLAYED")
  } finally {
    replayInProgress = false
  }
}

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      await replayQueue()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (!shouldHandleRequest(request)) {
    return
  }

  event.respondWith(
    (async () => {
      const networkRequest = request.clone()
      const queuedRequest = request.clone()
      try {
        return await fetch(networkRequest)
      } catch (error) {
        await enqueueRequest(queuedRequest)
        throw error
      }
    })(),
  )
})

self.addEventListener("sync", (event) => {
  if (event.tag === BOOKMARK_SYNC_TAG) {
    event.waitUntil(
      replayQueue().catch((error) => {
        console.warn("Background sync replay failed", error)
      }),
    )
  }
})

self.addEventListener("message", (event) => {
  const data = event.data
  if (!data || typeof data !== "object") {
    return
  }

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting()
    return
  }

  if (data.type === "REPLAY_QUEUE" && data.queue === BOOKMARK_QUEUE_NAME) {
    event.waitUntil(replayQueue())
  }
})
