# PostgREST Client SDK Rules Contract

> **Contract Version:** 1.0.0  
> **Last Updated:** 2026-01-12  
> **Status:** AUTHORITATIVE — All client code MUST comply  
> **Parent Contract:** `/contracts/SUPABASE_POSTGREST_PUBLIC_CONTRACT.md`

---

## A) Purpose & Scope

### What is Drift?

**Drift** occurs when frontend code diverges from the authoritative API contract through:

- Inventing new endpoints or query patterns not in the contract
- Using undocumented columns or operators
- Inconsistent header usage across different files
- Ad-hoc fetch calls scattered throughout components
- Hardcoded pagination values that differ from defaults
- Leaking server-only secrets to client bundles

### Why Drift Happens

1. **Convenience shortcuts** — Developer writes a quick fetch instead of using SDK
2. **Copy-paste errors** — Old patterns propagated without validation
3. **Undocumented features** — Someone discovers a PostgREST feature and uses it without contract update
4. **Time pressure** — "Just make it work" bypasses review

### How This Document Prevents Drift

| Drift Vector | Prevention Mechanism |
|--------------|---------------------|
| Ad-hoc fetches | SDK functions are the ONLY allowed entry points |
| Invented columns | Feature contracts define exact allowed fields |
| Header inconsistency | Canonical header sets defined once, used everywhere |
| Pagination chaos | Default `limit=20` enforced in SDK layer |
| Secret leakage | Explicit client/server boundaries with enforcement |
| New patterns | MUST update contract BEFORE implementation |

**Golden Rule:** If it's not in this contract, it's not allowed. Update the contract first.

---

## B) Required Environment Variables & Secrets Boundaries

### Client-Safe Variables (Browser / Edge / Server)

| Variable | Usage | Allowed In |
|----------|-------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Browser, Edge, Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous API key | Browser, Edge, Server |

### Server-Only Variables (NEVER in Browser)

| Variable | Usage | Allowed In |
|----------|-------|------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS | Server ONLY |
| `SUPABASE_JWT_SECRET` | Token verification | Server ONLY |

### MUST NOT Leak List

The following MUST NEVER appear in:
- Client components (`"use client"`)
- Files imported by client components
- Browser-accessible bundles
- Edge functions that run client-side

```
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
POSTGRES_PASSWORD
Any variable not prefixed with NEXT_PUBLIC_
```

### Enforcement

```typescript
// lib/supabase/env.ts — Server-only module
import "server-only";

export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// This file CANNOT be imported in client components
```

---

## C) Standard Headers & Request Shape

### Header Set: Public/Anonymous Reads

```http
GET /rest/v1/wp_posts_cache?select=*&limit=10
Host: {PROJECT_REF}.supabase.co
apikey: {ANON_KEY}
Accept: application/json
```

### Header Set: Authenticated User Calls

```http
GET /rest/v1/bookmarks?select=*
Host: {PROJECT_REF}.supabase.co
apikey: {ANON_KEY}
Authorization: Bearer {ACCESS_TOKEN}
Accept: application/json
```

### Header Set: Server/Service Calls (Server Only)

```http
POST /rest/v1/app_write_events
Host: {PROJECT_REF}.supabase.co
apikey: {ANON_KEY}
Authorization: Bearer {SERVICE_ROLE_KEY}
Content-Type: application/json
Prefer: return=representation
```

### Content-Type Rules

| Method | Content-Type | Required |
|--------|--------------|----------|
| GET | Not applicable | — |
| POST | `application/json` | MUST |
| PATCH | `application/json` | MUST |
| DELETE | Not applicable | — |

### Prefer Header Usage

| Scenario | Prefer Value |
|----------|--------------|
| Insert returning new row | `return=representation` |
| Insert returning minimal | `return=minimal` |
| Upsert | `resolution=merge-duplicates` |
| Count with data | `count=exact` |

---

## D) Canonical Data Access Layer (DAL) Design Rules

### SDK Location

```
lib/
└── supabase/
    └── rest/
        ├── client.ts        # Browser-safe Supabase client singleton
        ├── server.ts        # Server-only client with service role
        ├── headers.ts       # Canonical header builders
        ├── errors.ts        # Centralized error handling
        ├── types.ts         # Shared TypeScript types
        ├── bookmarks.ts     # Bookmark feature SDK
        ├── collections.ts   # Collection feature SDK
        ├── comments.ts      # Comment feature SDK
        ├── profiles.ts      # Profile feature SDK
        ├── wp-cache.ts      # WP posts cache SDK
        └── events.ts        # App write events SDK (server-only)
```

### Function Naming Convention

```typescript
// Pattern: {verb}{Resource}{Qualifier?}
listMyBookmarks()        // GET user's bookmarks
getBookmarkByPost()      // GET single by criteria
createBookmark()         // POST
updateBookmarkReadState() // PATCH specific field
deleteBookmark()         // DELETE

// Server-only suffix
upsertMyBookmarkCountersServerOnly()
logEventServerOnly()
```

### No Direct Fetch Rule

```typescript
// FORBIDDEN — Direct fetch in component
const res = await fetch(`${SUPABASE_URL}/rest/v1/bookmarks?...`);

// REQUIRED — Use SDK function
import { listMyBookmarks } from "@/lib/supabase/rest/bookmarks";
const bookmarks = await listMyBookmarks({ limit: 20 });
```

### Centralized Error Handling

```typescript
// lib/supabase/rest/errors.ts
export class PostgRESTError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details: string | null,
    public hint: string | null,
    public status: number
  ) {
    super(message);
    this.name = "PostgRESTError";
  }
}

export async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new PostgRESTError(
      error.code ?? "UNKNOWN",
      error.message ?? res.statusText,
      error.details ?? null,
      error.hint ?? null,
      res.status
    );
  }
  return res.json();
}
```

### Pagination Defaults

```typescript
// lib/supabase/rest/constants.ts
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// All list functions MUST apply default
export async function listMyBookmarks({ limit = DEFAULT_LIMIT, offset = 0 }) {
  // limit is always applied, never unbounded
}
```

---

## E) Caching & Revalidation Rules (Next.js)

### Server Components: Public Reads (Cacheable)

```typescript
// Public data — cache with ISR
const posts = await getCachedPost({
  edition_code: "sz",
  wp_post_id: 123,
  next: { revalidate: 300, tags: ["wp-cache:sz:123"] }
});
```

### User-Specific Reads (No Shared Cache)

```typescript
// User data — never cache in shared store
const bookmarks = await listMyBookmarks({
  limit: 20,
  next: { cache: "no-store" }
});
```

### Mutations: Cache Busting

```typescript
import { revalidateTag } from "next/cache";

// After mutation, invalidate related tags
await createBookmark({ wp_post_id: 123, edition_code: "sz" });
revalidateTag("bookmarks:user");
```

### DO / DON'T Matrix

| Scenario | DO | DON'T |
|----------|-----|-------|
| Public read (wp_posts_cache) | `{ next: { revalidate: 300 } }` | `{ cache: "no-store" }` |
| User bookmarks | `{ cache: "no-store" }` | `{ next: { revalidate: 60 } }` |
| User profile | `{ cache: "no-store" }` | Cache in shared store |
| POST/PATCH/DELETE | Always `no-store`, then revalidate tags | Cache mutation responses |
| List with pagination | Include offset in cache key or `no-store` | Cache paginated results in shared store |

### Fetch Options Template

```typescript
// lib/supabase/rest/fetch.ts
type CacheStrategy = 
  | { cache: "no-store" }
  | { next: { revalidate: number; tags?: string[] } };

export function publicReadCache(tags: string[]): CacheStrategy {
  return { next: { revalidate: 300, tags } };
}

export function userDataCache(): CacheStrategy {
  return { cache: "no-store" };
}
```

---

## F) Feature Contracts (Canonical SDK Functions)

### F.1) Bookmarks

#### `listMyBookmarks`

```typescript
function listMyBookmarks(params?: {
  edition_code?: string;
  collection_id?: string;
  read_state?: "unread" | "read";
  limit?: number;  // default: 20, max: 100
  offset?: number; // default: 0
}): Promise<Bookmark[]>
```

**Endpoint:** `GET /rest/v1/bookmarks`

**Allowed Querystring:**
```
?select=id,user_id,wp_post_id,edition_code,collection_id,read_state,created_at,updated_at
&user_id=eq.{from_jwt}
&edition_code=eq.{edition_code}
&collection_id=eq.{collection_id}
&read_state=eq.{read_state}
&order=created_at.desc
&limit={limit}
&offset={offset}
```

**Required Headers:** Authenticated User

**Response Shape:**
```typescript
interface Bookmark {
  id: string;
  user_id: string;
  wp_post_id: number;
  edition_code: string;
  collection_id: string | null;
  read_state: "unread" | "read";
  created_at: string;
  updated_at: string;
}
```

**Error Cases:**
- `401` — No/invalid token → redirect to login
- `403` — RLS denied → log and show generic error

---

#### `getBookmarkByPost`

```typescript
function getBookmarkByPost(params: {
  wp_post_id: number;
  edition_code: string;
}): Promise<Bookmark | null>
```

**Endpoint:** `GET /rest/v1/bookmarks`

**Allowed Querystring:**
```
?select=id,user_id,wp_post_id,edition_code,collection_id,read_state,created_at,updated_at
&wp_post_id=eq.{wp_post_id}
&edition_code=eq.{edition_code}
&limit=1
```

**Required Headers:** Authenticated User

---

#### `createBookmark`

```typescript
function createBookmark(params: {
  wp_post_id: number;
  edition_code: string;
  collection_id?: string;
}): Promise<Bookmark>
```

**Endpoint:** `POST /rest/v1/bookmarks`

**Request Body:**
```json
{
  "wp_post_id": 123,
  "edition_code": "sz",
  "collection_id": "uuid-or-null"
}
```

**Required Headers:** Authenticated User + `Content-Type: application/json` + `Prefer: return=representation`

**MUST NOT include:** `user_id` (set by RLS default), `id`, `created_at`, `updated_at`

---

#### `updateBookmarkReadState`

```typescript
function updateBookmarkReadState(params: {
  id: string;
  read_state: "unread" | "read";
}): Promise<Bookmark>
```

**Endpoint:** `PATCH /rest/v1/bookmarks?id=eq.{id}`

**Request Body:**
```json
{
  "read_state": "read"
}
```

**Required Headers:** Authenticated User + `Content-Type: application/json` + `Prefer: return=representation`

---

#### `deleteBookmark`

```typescript
function deleteBookmark(params: { id: string }): Promise<void>
```

**Endpoint:** `DELETE /rest/v1/bookmarks?id=eq.{id}`

**Required Headers:** Authenticated User

---

#### `deleteBookmarksForPost`

```typescript
function deleteBookmarksForPost(params: {
  wp_post_id: number;
  edition_code: string;
}): Promise<void>
```

**Endpoint:** `DELETE /rest/v1/bookmarks?wp_post_id=eq.{wp_post_id}&edition_code=eq.{edition_code}`

**Required Headers:** Authenticated User

---

### F.2) Bookmark Collections

#### `listMyCollections`

```typescript
function listMyCollections(): Promise<BookmarkCollection[]>
```

**Endpoint:** `GET /rest/v1/bookmark_collections`

**Allowed Querystring:**
```
?select=id,user_id,name,description,is_default,created_at,updated_at
&order=is_default.desc,name.asc
```

**Required Headers:** Authenticated User

---

#### `createCollection`

```typescript
function createCollection(params: {
  name: string;
  description?: string;
  is_default?: boolean;
}): Promise<BookmarkCollection>
```

**Endpoint:** `POST /rest/v1/bookmark_collections`

**Request Body:**
```json
{
  "name": "Read Later",
  "description": "Articles to read later",
  "is_default": false
}
```

**Required Headers:** Authenticated User + `Content-Type: application/json` + `Prefer: return=representation`

---

#### `updateCollection`

```typescript
function updateCollection(params: {
  id: string;
  name?: string;
  description?: string;
  is_default?: boolean;
}): Promise<BookmarkCollection>
```

**Endpoint:** `PATCH /rest/v1/bookmark_collections?id=eq.{id}`

**Required Headers:** Authenticated User + `Content-Type: application/json` + `Prefer: return=representation`

---

#### `deleteCollection`

```typescript
function deleteCollection(params: { id: string }): Promise<void>
```

**Endpoint:** `DELETE /rest/v1/bookmark_collections?id=eq.{id}`

**Required Headers:** Authenticated User

**Note:** RLS prevents deletion of `is_default=true` collection.

---

### F.3) Bookmark Counters

#### `getMyBookmarkCounters`

```typescript
function getMyBookmarkCounters(): Promise<BookmarkUserCounter | null>
```

**Endpoint:** `GET /rest/v1/bookmark_user_counters`

**Allowed Querystring:**
```
?select=user_id,total_bookmarks,unread_bookmarks,updated_at
&limit=1
```

**Required Headers:** Authenticated User

---

#### `upsertMyBookmarkCountersServerOnly`

```typescript
// SERVER-ONLY — lib/supabase/rest/server/counters.ts
import "server-only";

function upsertMyBookmarkCountersServerOnly(params: {
  user_id: string;
  total_bookmarks: number;
  unread_bookmarks: number;
}): Promise<BookmarkUserCounter>
```

**Endpoint:** `POST /rest/v1/bookmark_user_counters`

**Required Headers:** Service Role + `Prefer: resolution=merge-duplicates,return=representation`

**MUST NOT be imported in client bundles.**

---

### F.4) Comments

#### `listApprovedComments`

```typescript
function listApprovedComments(params: {
  wp_post_id: number;
  edition_code: string;
  limit?: number;  // default: 20
  offset?: number; // default: 0
}): Promise<Comment[]>
```

**Endpoint:** `GET /rest/v1/comments`

**Allowed Querystring:**
```
?select=id,user_id,wp_post_id,edition_code,parent_id,body,status,created_at,updated_at,profiles(display_name,avatar_url)
&wp_post_id=eq.{wp_post_id}
&edition_code=eq.{edition_code}
&status=eq.approved
&order=created_at.asc
&limit={limit}
&offset={offset}
```

**Required Headers:** Public/Anonymous (approved comments are public)

**Note:** Uses foreign key join to `profiles` for author info.

---

#### `createComment`

```typescript
function createComment(params: {
  wp_post_id: number;
  edition_code: string;
  body: string;
  parent_id?: string;
}): Promise<Comment>
```

**Endpoint:** `POST /rest/v1/comments`

**Request Body:**
```json
{
  "wp_post_id": 123,
  "edition_code": "sz",
  "body": "Great article!",
  "parent_id": null
}
```

**Required Headers:** Authenticated User + `Content-Type: application/json` + `Prefer: return=representation`

**MUST NOT include:** `user_id`, `status` (defaults to "pending")

---

#### `updateMyCommentBody`

```typescript
function updateMyCommentBody(params: {
  id: string;
  body: string;
}): Promise<Comment>
```

**Endpoint:** `PATCH /rest/v1/comments?id=eq.{id}`

**Request Body:**
```json
{
  "body": "Updated comment text"
}
```

**Required Headers:** Authenticated User + `Content-Type: application/json` + `Prefer: return=representation`

**MUST NOT update:** `status`, `user_id`, `wp_post_id`, `edition_code`

---

#### `deleteMyComment`

```typescript
function deleteMyComment(params: { id: string }): Promise<void>
```

**Endpoint:** `DELETE /rest/v1/comments?id=eq.{id}`

**Required Headers:** Authenticated User

**Note:** RLS ensures user can only delete their own comments.

---

#### `reportComment`

```typescript
function reportComment(params: {
  comment_id: string;
  reason?: string;
}): Promise<CommentReport>
```

**Endpoint:** `POST /rest/v1/comment_reports`

**Request Body:**
```json
{
  "comment_id": "uuid",
  "reason": "Spam"
}
```

**Required Headers:** Authenticated User + `Content-Type: application/json` + `Prefer: return=representation`

---

### F.5) Comment Counters

#### `getCommentCounters`

```typescript
function getCommentCounters(params: {
  wp_post_id: number;
  edition_code: string;
}): Promise<CommentPostCounter | null>
```

**Endpoint:** `GET /rest/v1/comment_post_counters`

**Allowed Querystring:**
```
?select=wp_post_id,edition_code,total_comments,approved_comments,updated_at
&wp_post_id=eq.{wp_post_id}
&edition_code=eq.{edition_code}
&limit=1
```

**Required Headers:** Public/Anonymous

---

#### `updateCountersServerOnly`

```typescript
// SERVER-ONLY
import "server-only";

function updateCountersServerOnly(params: {
  wp_post_id: number;
  edition_code: string;
  total_comments: number;
  approved_comments: number;
}): Promise<CommentPostCounter>
```

**Endpoint:** `POST /rest/v1/comment_post_counters`

**Required Headers:** Service Role + `Prefer: resolution=merge-duplicates,return=representation`

---

### F.6) Profiles

#### `getMyProfile`

```typescript
function getMyProfile(): Promise<Profile | null>
```

**Endpoint:** `GET /rest/v1/profiles`

**Allowed Querystring:**
```
?select=id,display_name,avatar_url,created_at,updated_at
&limit=1
```

**Required Headers:** Authenticated User

---

#### `updateMyProfile`

```typescript
function updateMyProfile(params: {
  display_name?: string;
  avatar_url?: string;
}): Promise<Profile>
```

**Endpoint:** `PATCH /rest/v1/profiles?id=eq.{user_id_from_jwt}`

**Request Body:**
```json
{
  "display_name": "John Doe",
  "avatar_url": "https://..."
}
```

**Required Headers:** Authenticated User + `Content-Type: application/json` + `Prefer: return=representation`

---

### F.7) WP Posts Cache (Public Read)

#### `getCachedPost`

```typescript
function getCachedPost(params: {
  edition_code: string;
  wp_post_id: number;
}): Promise<WPPostCache | null>
```

**Endpoint:** `GET /rest/v1/wp_posts_cache`

**Allowed Querystring:**
```
?select=edition_code,wp_post_id,slug,title,excerpt,featured_image_url,published_at,cached_at
&edition_code=eq.{edition_code}
&wp_post_id=eq.{wp_post_id}
&limit=1
```

**Required Headers:** Public/Anonymous

**Cache:** `{ next: { revalidate: 300, tags: ["wp-cache:{edition}:{post_id}"] } }`

---

#### `findCachedPostBySlug`

```typescript
function findCachedPostBySlug(params: {
  edition_code?: string;
  slug: string;
}): Promise<WPPostCache | null>
```

**Endpoint:** `GET /rest/v1/wp_posts_cache`

**Allowed Querystring:**
```
?select=edition_code,wp_post_id,slug,title,excerpt,featured_image_url,published_at,cached_at
&slug=eq.{slug}
&edition_code=eq.{edition_code}  // optional
&limit=1
```

**Required Headers:** Public/Anonymous

---

#### `searchCachedPostsByTitle`

```typescript
function searchCachedPostsByTitle(params: {
  edition_code?: string;
  q: string;
  limit?: number; // default: 20
}): Promise<WPPostCache[]>
```

**Endpoint:** `GET /rest/v1/wp_posts_cache`

**Allowed Querystring:**
```
?select=edition_code,wp_post_id,slug,title,excerpt,featured_image_url,published_at
&title=ilike.*{q}*
&edition_code=eq.{edition_code}  // optional
&order=published_at.desc
&limit={limit}
```

**Required Headers:** Public/Anonymous

**Note:** Uses `ilike` for case-insensitive search. Wildcard `*` maps to `%`.

---

### F.8) App Write Events

#### `logEventServerOnly`

```typescript
// SERVER-ONLY
import "server-only";

function logEventServerOnly(params: {
  user_id?: string;
  action: string;
  key?: string;
}): Promise<AppWriteEvent>
```

**Endpoint:** `POST /rest/v1/app_write_events`

**Request Body:**
```json
{
  "user_id": "uuid-or-null",
  "action": "bookmark_created",
  "key": "sz:123"
}
```

**Required Headers:** Service Role + `Content-Type: application/json` + `Prefer: return=representation`

---

#### `listMyEvents`

```typescript
function listMyEvents(params?: {
  limit?: number;
  offset?: number;
}): Promise<AppWriteEvent[]>
```

**Endpoint:** `GET /rest/v1/app_write_events`

**Allowed Querystring:**
```
?select=id,user_id,action,key,created_at
&order=created_at.desc
&limit={limit}
&offset={offset}
```

**Required Headers:** Authenticated User

**Note:** RLS filters to user's own events only.

---

## G) Timezone & Timestamp Handling (Performance Guardrail)

### Strict Rules

1. **Storage:** All timestamps MUST be stored in UTC (`timestamptz`)
2. **Transmission:** All API responses return ISO 8601 UTC strings
3. **UI Formatting:** Client formats to local time for display
4. **Timezone Resolution:** Computed ONCE per session and cached

### MUST NOT

```typescript
// FORBIDDEN — Causes repeated pg_timezone_names queries
const tz = await supabase.rpc('get_timezone');
const posts = await listPosts();
const tz2 = await supabase.rpc('get_timezone'); // DRIFT!
```

### Correct Pattern

```typescript
// lib/timezone.ts
let cachedTimezone: string | null = null;

export function getUserTimezone(): string {
  if (cachedTimezone) return cachedTimezone;
  
  // Resolve once from browser
  cachedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return cachedTimezone;
}

// Usage in UI
import { getUserTimezone } from "@/lib/timezone";
import { formatInTimeZone } from "date-fns-tz";

function ArticleDate({ isoDate }: { isoDate: string }) {
  const tz = getUserTimezone();
  const formatted = formatInTimeZone(isoDate, tz, "MMM d, yyyy h:mm a");
  return <time dateTime={isoDate}>{formatted}</time>;
}
```

### Rule

**MUST NOT query `pg_timezone_names` from application code.**

---

## H) Security & RLS Expectations (Client Perspective)

### What Client Can Assume

| Assumption | Enforced By |
|------------|-------------|
| User cannot read other users' bookmarks | RLS policy `user_id = auth.uid()` |
| User cannot update other users' comments | RLS policy on UPDATE |
| User cannot set `status` on comments | RLS blocks field (column security) |
| User cannot read `auth_blocked_passwords` | Table not exposed to anon/authenticated |
| Counters are accurate | Server-only triggers update them |

### What Client MUST Do

| Requirement | Implementation |
|-------------|----------------|
| Include auth token for user tables | `Authorization: Bearer {token}` header |
| Never send `user_id` in POST body | RLS default sets it from JWT |
| Never attempt to update `status` | Don't include in PATCH body |
| Handle 401 gracefully | Redirect to login or refresh token |
| Handle 403 gracefully | Show "access denied" message |

### Trust Boundary

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│  ┌─────────────┐                            │
│  │ SDK Layer   │ ← Only place that calls    │
│  │             │   PostgREST endpoints      │
│  └──────┬──────┘                            │
│         │ fetch with anon_key + JWT         │
└─────────┼───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│            Supabase PostgREST               │
│  ┌─────────────────────────────────────┐    │
│  │ RLS Policies (auth.uid() checks)    │    │
│  │ Column Security (no status update)  │    │
│  │ Table Exposure (no blocked_passwords)│    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## I) No-Drift Enforcement Checklist (PR Gate)

### Required Checks Before Merge

- [ ] **No raw fetches** — All `/rest/v1` calls go through SDK functions
- [ ] **Querystrings match contract** — Operators, columns, order match allowed patterns
- [ ] **Pagination default respected** — Uses `DEFAULT_LIMIT` (20) unless explicitly overridden
- [ ] **Correct headers** — Uses canonical header builders, not ad-hoc
- [ ] **Server-only isolation** — Functions marked `ServerOnly` have `import "server-only"`
- [ ] **No service_role in client** — `SUPABASE_SERVICE_ROLE_KEY` only in server modules
- [ ] **Error handling consistent** — Uses `parseResponse()` from SDK
- [ ] **Cache strategy correct** — User data uses `no-store`, public uses `revalidate`
- [ ] **No new columns/tables** — If needed, update contracts FIRST
- [ ] **Timestamps in UTC** — No timezone queries, formatting done client-side

### Automated Lint Rules (Recommended)

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["**/rest/server/*"],
        importNames: ["*"],
        message: "Server-only SDK functions cannot be imported in client components"
      }]
    }],
    "no-restricted-syntax": ["error", {
      selector: "CallExpression[callee.name='fetch'][arguments.0.value=/\\/rest\\/v1/]",
      message: "Direct fetch to /rest/v1 is forbidden. Use SDK functions."
    }]
  }
};
```

---

## J) Appendix: Copy-Paste Examples

### Example 1: List Unread Bookmarks

```typescript
// Client component
const bookmarks = await listMyBookmarks({
  read_state: "unread",
  limit: 20,
  offset: 0
});

// Underlying fetch
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/bookmarks?select=id,wp_post_id,edition_code,collection_id,read_state,created_at&read_state=eq.unread&order=created_at.desc&limit=20&offset=0`,
  {
    headers: {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json"
    },
    cache: "no-store"
  }
);
```

### Example 2: Create Bookmark

```typescript
const bookmark = await createBookmark({
  wp_post_id: 123,
  edition_code: "sz",
  collection_id: null
});

// Underlying fetch
const res = await fetch(`${SUPABASE_URL}/rest/v1/bookmarks`, {
  method: "POST",
  headers: {
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  body: JSON.stringify({
    wp_post_id: 123,
    edition_code: "sz",
    collection_id: null
  }),
  cache: "no-store"
});
```

### Example 3: Move Bookmark to Collection (PATCH)

```typescript
const updated = await updateBookmark({
  id: "uuid-bookmark-id",
  collection_id: "uuid-collection-id"
});

// Underlying fetch
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/bookmarks?id=eq.uuid-bookmark-id`,
  {
    method: "PATCH",
    headers: {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({ collection_id: "uuid-collection-id" }),
    cache: "no-store"
  }
);
```

### Example 4: List Collections

```typescript
const collections = await listMyCollections();

// Underlying fetch
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/bookmark_collections?select=id,name,description,is_default,created_at&order=is_default.desc,name.asc`,
  {
    headers: {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${accessToken}`
    },
    cache: "no-store"
  }
);
```

### Example 5: Create Comment

```typescript
const comment = await createComment({
  wp_post_id: 456,
  edition_code: "za",
  body: "Great insights!",
  parent_id: null
});

// Underlying fetch
const res = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
  method: "POST",
  headers: {
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  body: JSON.stringify({
    wp_post_id: 456,
    edition_code: "za",
    body: "Great insights!",
    parent_id: null
  }),
  cache: "no-store"
});
```

### Example 6: List Approved Comments

```typescript
const comments = await listApprovedComments({
  wp_post_id: 456,
  edition_code: "za",
  limit: 50
});

// Underlying fetch (public, no auth required)
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/comments?select=id,user_id,body,status,created_at,profiles(display_name,avatar_url)&wp_post_id=eq.456&edition_code=eq.za&status=eq.approved&order=created_at.asc&limit=50`,
  {
    headers: {
      "apikey": ANON_KEY,
      "Accept": "application/json"
    },
    next: { revalidate: 60, tags: ["comments:za:456"] }
  }
);
```

### Example 7: Report Comment

```typescript
const report = await reportComment({
  comment_id: "uuid-comment-id",
  reason: "Spam content"
});

// Underlying fetch
const res = await fetch(`${SUPABASE_URL}/rest/v1/comment_reports`, {
  method: "POST",
  headers: {
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  body: JSON.stringify({
    comment_id: "uuid-comment-id",
    reason: "Spam content"
  }),
  cache: "no-store"
});
```

### Example 8: Get and Update Profile

```typescript
// Get
const profile = await getMyProfile();

// Update
const updated = await updateMyProfile({
  display_name: "Jane Doe",
  avatar_url: "https://example.com/avatar.jpg"
});

// Underlying update fetch
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
  {
    method: "PATCH",
    headers: {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      display_name: "Jane Doe",
      avatar_url: "https://example.com/avatar.jpg"
    }),
    cache: "no-store"
  }
);
```

### Example 9: Get WP Post Cache by Slug

```typescript
const post = await findCachedPostBySlug({
  edition_code: "sz",
  slug: "breaking-news-article"
});

// Underlying fetch (public, cacheable)
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/wp_posts_cache?select=edition_code,wp_post_id,slug,title,excerpt,featured_image_url,published_at&slug=eq.breaking-news-article&edition_code=eq.sz&limit=1`,
  {
    headers: {
      "apikey": ANON_KEY
    },
    next: { revalidate: 300, tags: ["wp-cache:sz:slug:breaking-news-article"] }
  }
);
```

### Example 10: Get Comment Counters

```typescript
const counters = await getCommentCounters({
  wp_post_id: 456,
  edition_code: "za"
});

// Underlying fetch (public)
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/comment_post_counters?select=wp_post_id,edition_code,total_comments,approved_comments&wp_post_id=eq.456&edition_code=eq.za&limit=1`,
  {
    headers: {
      "apikey": ANON_KEY
    },
    next: { revalidate: 60, tags: ["comment-counters:za:456"] }
  }
);
```

### Example 11: Log Event (SERVER-ONLY)

```typescript
// lib/supabase/rest/server/events.ts
import "server-only";

const event = await logEventServerOnly({
  user_id: "uuid-user-id",
  action: "bookmark_created",
  key: "sz:123"
});

// Underlying fetch (service role)
const res = await fetch(`${SUPABASE_URL}/rest/v1/app_write_events`, {
  method: "POST",
  headers: {
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  body: JSON.stringify({
    user_id: "uuid-user-id",
    action: "bookmark_created",
    key: "sz:123"
  }),
  cache: "no-store"
});
```

### Example 12: Upsert Bookmark Counters (SERVER-ONLY)

```typescript
// lib/supabase/rest/server/counters.ts
import "server-only";

const counters = await upsertMyBookmarkCountersServerOnly({
  user_id: "uuid-user-id",
  total_bookmarks: 42,
  unread_bookmarks: 10
});

// Underlying fetch (service role, upsert)
const res = await fetch(`${SUPABASE_URL}/rest/v1/bookmark_user_counters`, {
  method: "POST",
  headers: {
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation"
  },
  body: JSON.stringify({
    user_id: "uuid-user-id",
    total_bookmarks: 42,
    unread_bookmarks: 10
  }),
  cache: "no-store"
});
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-12 | v0 | Initial contract |

---

**END OF CONTRACT**
