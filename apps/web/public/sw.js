const BOOKMARK_QUEUE_NAME = "bookmarks-write-queue"
const BOOKMARK_SYNC_TAG = "bookmarks-write-queue-sync"
const DB_NAME = "bookmark-sync-db"
const DB_VERSION = 1
const STORE_NAME = "queue"
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])
const BOOKMARK_ACTION_ENDPOINT = "/api/bookmarks"

const ACTION_NAME_MAP = new Map([
  ["addBookmark", "add"],
  ["removeBookmark", "remove"],
  ["bulkRemoveBookmarks", "bulk-remove"],
  ["updateBookmark", "update"],
  ["markRead", "mark-read"],
  ["markUnread", "mark-unread"],
])
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

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch (error) {
    console.warn("Failed to parse JSON payload for background sync", error)
    return null
  }
}

function normalizeActionName(actionId) {
  if (!actionId) return null
  const trimmed = actionId.slice(2) // drop info byte prefix
  const hashIndex = trimmed.lastIndexOf("#")
  if (hashIndex === -1) return trimmed
  return trimmed.slice(hashIndex + 1)
}

function ensureStringArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item)
  }
  if (typeof value === "string" && value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function extractAuthToken(request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader) {
    return authHeader
  }
  const supabaseHeader = request.headers.get("x-supabase-auth")
  if (supabaseHeader) {
    return supabaseHeader
  }
  return null
}

function classifyUpdateAction(postId, updates) {
  if (!postId || typeof updates !== "object" || updates === null) {
    return { action: "update", postId, note: null, updates: {} }
  }

  const readState = Object.prototype.hasOwnProperty.call(updates, "readState")
    ? updates.readState
    : updates.read_state
  if (typeof readState === "string") {
    const status = readState
    if (status === "read") {
      return { action: "mark-read", postId, note: null, updates: null }
    }
    if (status === "unread") {
      return { action: "mark-unread", postId, note: null, updates: null }
    }
  }

  const hasNoteUpdate =
    Object.prototype.hasOwnProperty.call(updates, "note") ||
    Object.prototype.hasOwnProperty.call(updates, "notes")

  if (hasNoteUpdate) {
    const noteValue = Object.prototype.hasOwnProperty.call(updates, "note")
      ? updates.note
      : updates.notes
    let note = null
    if (typeof noteValue === "string") {
      note = noteValue
    } else if (noteValue === null) {
      note = null
    }
    return { action: "update-note", postId, note, updates: null }
  }

  return { action: "update", postId, note: null, updates }
}

async function extractBookmarkMutation(request) {
  const url = new URL(request.url)
  const method = request.method.toUpperCase()
  const authToken = extractAuthToken(request)

  const baseEntry = {
    queue: BOOKMARK_QUEUE_NAME,
    timestamp: Date.now(),
    authToken,
    endpoint: BOOKMARK_ACTION_ENDPOINT,
  }

  if (url.pathname.startsWith(BOOKMARK_ACTION_ENDPOINT)) {
    if (method === "DELETE") {
      const singlePostId = url.searchParams.get("postId")
      const postIdsParam = url.searchParams.get("postIds")
      const postIds = ensureStringArray(postIdsParam)

      if (singlePostId) {
        return { ...baseEntry, action: "remove", postId: singlePostId }
      }

      if (postIds.length > 0) {
        return { ...baseEntry, action: "bulk-remove", postIds }
      }

      throw new Error("Unable to determine bookmark IDs for DELETE request")
    }

    if (method === "POST" || method === "PUT" || method === "PATCH") {
      let body = null
      try {
        body = await request.clone().json()
      } catch (error) {
        console.warn("Failed to parse bookmark mutation body", error)
        body = null
      }

      if (!body || typeof body !== "object") {
        throw new Error("Bookmark mutation body is empty or invalid")
      }

      const postId = typeof body.postId === "string" ? body.postId : null

      if (method === "POST") {
        if (!postId) {
          throw new Error("Missing postId for bookmark add mutation")
        }
        const note = typeof body.note === "string"
          ? body.note
          : typeof body.notes === "string"
            ? body.notes
            : body.note ?? body.notes ?? null
        return { ...baseEntry, action: "add", postId, note }
      }

      if (!postId) {
        throw new Error("Missing postId for bookmark update mutation")
      }

      const normalizedUpdates = body.updates && typeof body.updates === "object"
        ? body.updates
        : {}
      const { action, note, updates } = classifyUpdateAction(postId, normalizedUpdates)

      if (action === "update") {
        return { ...baseEntry, action, postId, updates }
      }

      return { ...baseEntry, action, postId, note: note ?? null }
    }

    throw new Error(`Unsupported HTTP method for bookmark queue: ${method}`)
  }

  const actionHeader = request.headers.get("next-action") || ""
  if (!actionHeader) {
    return null
  }

  const actionName = normalizeActionName(actionHeader)
  const mapped = ACTION_NAME_MAP.get(actionName || "")
  if (!mapped) {
    return null
  }

  const rawBody = await request.clone().text()
  if (!rawBody) {
    throw new Error("Server action request body is empty")
  }

  const parsed = safeJsonParse(rawBody)
  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected server action payload")
  }

  const firstArg = parsed[0]

  switch (mapped) {
    case "add": {
      const postId = typeof firstArg?.postId === "string" ? firstArg.postId : null
      if (!postId) {
        throw new Error("Missing postId for add bookmark action")
      }
      const note = typeof firstArg?.note === "string"
        ? firstArg.note
        : typeof firstArg?.notes === "string"
          ? firstArg.notes
          : firstArg?.note ?? firstArg?.notes ?? null
      return { ...baseEntry, action: "add", postId, note }
    }
    case "remove": {
      const postId = typeof firstArg === "string" ? firstArg : typeof firstArg?.postId === "string" ? firstArg.postId : null
      if (!postId) {
        throw new Error("Missing postId for remove bookmark action")
      }
      return { ...baseEntry, action: "remove", postId }
    }
    case "bulk-remove": {
      const postIds = ensureStringArray(firstArg?.postIds)
      if (postIds.length === 0) {
        throw new Error("Missing postIds for bulk remove action")
      }
      return { ...baseEntry, action: "bulk-remove", postIds }
    }
    case "update": {
      const postId = typeof firstArg?.postId === "string" ? firstArg.postId : null
      if (!postId) {
        throw new Error("Missing postId for update bookmark action")
      }
      const normalizedUpdates =
        firstArg?.updates && typeof firstArg.updates === "object" ? firstArg.updates : {}
      const { action, note, updates } = classifyUpdateAction(postId, normalizedUpdates)
      if (action === "update") {
        return { ...baseEntry, action, postId, updates }
      }
      return { ...baseEntry, action, postId, note: note ?? null }
    }
    case "mark-read": {
      const postId = typeof firstArg === "string" ? firstArg : typeof firstArg?.postId === "string" ? firstArg.postId : null
      if (!postId) {
        throw new Error("Missing postId for markRead action")
      }
      return { ...baseEntry, action: "mark-read", postId }
    }
    case "mark-unread": {
      const postId = typeof firstArg === "string" ? firstArg : typeof firstArg?.postId === "string" ? firstArg.postId : null
      if (!postId) {
        throw new Error("Missing postId for markUnread action")
      }
      return { ...baseEntry, action: "mark-unread", postId }
    }
    default:
      return null
  }
}

async function serializeRequest(request) {
  const mutation = await extractBookmarkMutation(request)
  if (!mutation) {
    return null
  }

  return mutation
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
  if (!entry) {
    console.warn("Skipping background sync queue entry: unsupported request")
    return
  }
  await addToQueue(entry)
  try {
    const pendingEntries = await readQueue()
    await notifyClients("BACKGROUND_SYNC_ENQUEUE", { pending: pendingEntries.length })
  } catch (error) {
    console.warn("Failed to read queue size after enqueue", error)
    await notifyClients("BACKGROUND_SYNC_ENQUEUE")
  }

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

function buildReplayRequest(entry) {
  const action = entry.action
  const url = new URL(entry.endpoint || BOOKMARK_ACTION_ENDPOINT, self.location.origin)
  const headers = new Headers()
  headers.set("x-sw-background-sync", "1")
  const init = {
    method: "POST",
    headers,
    credentials: "include",
  }

  if (entry.authToken) {
    headers.set("authorization", entry.authToken)
  }

  switch (action) {
    case "add": {
      init.method = "POST"
      const payload = { postId: entry.postId }
      if (typeof entry.note === "string") {
        payload.note = entry.note
      } else if (entry.note === null) {
        payload.note = null
      }
      init.body = JSON.stringify(payload)
      headers.set("content-type", "application/json")
      break
    }
    case "remove": {
      init.method = "DELETE"
      if (entry.postId) {
        url.searchParams.set("postId", entry.postId)
      }
      break
    }
    case "bulk-remove": {
      init.method = "DELETE"
      if (Array.isArray(entry.postIds) && entry.postIds.length > 0) {
        url.searchParams.set("postIds", entry.postIds.join(","))
      }
      break
    }
    case "mark-read": {
      init.method = "PUT"
      init.body = JSON.stringify({ postId: entry.postId, updates: { readState: "read" } })
      headers.set("content-type", "application/json")
      break
    }
    case "mark-unread": {
      init.method = "PUT"
      init.body = JSON.stringify({ postId: entry.postId, updates: { readState: "unread" } })
      headers.set("content-type", "application/json")
      break
    }
    case "update-note": {
      init.method = "PUT"
      const note = typeof entry.note === "string" ? entry.note : entry.note ?? null
      init.body = JSON.stringify({ postId: entry.postId, updates: { note } })
      headers.set("content-type", "application/json")
      break
    }
    case "update": {
      init.method = "PUT"
      const updates = entry.updates && typeof entry.updates === "object" ? entry.updates : {}
      init.body = JSON.stringify({ postId: entry.postId, updates })
      headers.set("content-type", "application/json")
      break
    }
    default:
      throw new Error(`Unsupported bookmark action: ${action}`)
  }

  return { url: url.toString(), init }
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
    let remaining = entries.length

    await notifyClients("BACKGROUND_SYNC_REPLAYING", { pending: remaining })

    for (const entry of entries) {
      try {
        const { url, init } = buildReplayRequest(entry)
        const response = await fetch(url, init)
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
        remaining -= 1
        await notifyClients("BACKGROUND_SYNC_QUEUE_PROGRESS", { remaining })
      } catch (error) {
        if (isNetworkError(error)) {
          encounteredError = error
          break
        }

        if (typeof entry.id !== "undefined") {
          await removeFromQueue(entry.id)
        }
        encounteredError = error instanceof Error ? error : new Error(String(error))
        remaining -= 1
        await notifyClients("BACKGROUND_SYNC_QUEUE_PROGRESS", { remaining })
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
