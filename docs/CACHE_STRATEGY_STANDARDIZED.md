# News On Africa - Standardized Cache Strategy (3 Classes)

## Overview
All data fetching in the News On Africa app MUST use one of 3 cache classes. This prevents accidental complexity, ensures predictable behavior, and simplifies debugging.

## Class 1: Content Pages (ISR + Tags)
**Use for**: Static or semi-static content that updates infrequently via webhooks.

**Pages**:
- Home page (editions + feeds)
- Category pages
- Article detail pages
- Tag/author pages

**Cache Strategy**:
```typescript
// In page.tsx or route handler
export const revalidate = 3600 // ISR: revalidate every hour
export const dynamicParams = true // generate on-demand

// In data fetching
const gqlResult = await fetchWordPressGraphQL(countryCode, QUERY, variables, {
  tags: [
    cacheTags.home(countryCode),     // e.g., "home:sz"
    cacheTags.category(countryCode, slug),  // e.g., "category:sz:politics"
  ]
})
```

**Revalidation**: Via WordPress webhooks → `/api/revalidate` → `revalidateTag()` (instant)

**Caching Duration**:
- Default: 3600 seconds (1 hour)
- Home/category feeds: 3600s
- Article detail: 600s (10 minutes)

---

## Class 2: User Pages (Dynamic / No-Store)
**Use for**: User-specific, authenticated-only content that must always be fresh.

**Pages**:
- Bookmarks
- Profile
- Preferences
- Comments on articles

**Cache Strategy**:
```typescript
// In route.ts or server action
export const revalidate = 0  // Never cache
// OR
revalidate: CACHE_DURATIONS.NONE  // Explicit no-cache

// In fetches
const bookmarks = await fetchBookmarks(userId, {
  cache: "no-store",  // Always fresh from PostgREST
  revalidate: false   // Disable ISR
})
```

**Caching Duration**: None (always fresh)

**Security**: All authenticated endpoints use RLS + JWT validation

---

## Class 3: Search (Client-Only, No-Store)
**Use for**: Search results and real-time filtering that don't benefit from caching.

**Pages**:
- `/search?q=...`
- Client-side autocomplete

**Cache Strategy**:
```typescript
// In route.ts
export const revalidate = 0

// In client component (SWR)
const { data, isLoading } = useSWR(
  `/api/search?q=${query}`,
  (url) => fetch(url, { cache: "no-store" }),
  { revalidateOnFocus: false, dedupingInterval: 500 }
)
```

**Caching Duration**: None (in-memory dedup only)

**Notes**: Search is rarely cached because queries vary wildly; in-memory dedup prevents thundering herd for identical rapid requests.

---

## Cache Class Decision Tree

```
Is it WordPress content?
├─ Yes, published content?
│  └─ Use CLASS 1 (ISR + Tags)
│
└─ No, is it user data?
   ├─ Yes, bookmarks/profile/comments?
   │  └─ Use CLASS 2 (Dynamic / No-Store)
   │
   └─ No, is it search?
      └─ Use CLASS 3 (Client-Only)
```

---

## Forbidden Patterns

❌ **DO NOT**:
- Mix classes (e.g., ISR + Supabase in same route)
- Add custom `cache` logic per route
- Use Redis/Upstash as fallback (removed)
- Try to cache user-specific data via ISR
- Cache search results (defeats purpose)

✅ **DO**:
- Declare cache class in route exports
- Use explicit tags from `cacheTags.*` helpers
- Return clear errors on GraphQL failure (retry later, not stale)
- Use SWR for client-side real-time data

---

## Implementation Checklist

- [ ] Route declares `export const revalidate = X` or `export const dynamicParams`
- [ ] Data fetch specifies cache class via tags OR cache policy
- [ ] GraphQL queries include appropriate tags
- [ ] User data routes use `cache: "no-store"`
- [ ] Search routes avoid caching entirely
- [ ] Error handling shows "retry later" (not stale fallback)

---

## Migration Status
- ✅ Removed Redis/Upstash fallback
- ✅ Article pages are fully static (Class 1)
- ✅ Comments moved to client-only (Class 2)
- ✅ Search is client-only (Class 3)
- ✅ Documented 3 cache classes
