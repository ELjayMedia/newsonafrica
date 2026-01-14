# News On Africa – Architecture Contract
Version: 1.0  
Status: ENFORCED  
Owner: EljayMedia  
Last Updated: 2026-01-12

---

## 1. Purpose

This document defines **non-negotiable architectural rules** for the News On Africa platform.

Its goals are to:
- Prevent architectural drift
- Enforce a single, optimal WordPress → Next.js integration model
- Keep caching, revalidation, and data flow predictable
- Ensure scalability across multiple African country editions

Any code, refactor, or feature that violates this contract **must be rejected**.

---

## 2. Content Source of Truth

### 2.1 Primary CMS
- **WordPress Multisite** is the authoritative content source.
- Each country edition maps to one WordPress sub-site.

### 2.2 API Contract
- **WPGraphQL is the PRIMARY and DEFAULT API**
- WordPress REST API is:
  - ❌ NOT used for core content rendering
  - ✅ Allowed only as an emergency fallback

### 2.3 Forbidden Patterns
- ❌ Mixing REST + GraphQL for the same page
- ❌ Fetching WordPress content directly from client components
- ❌ Client-side WordPress authentication

---

## 3. Rendering & Caching Model (MANDATORY)

### 3.1 Rendering Strategy
- All WordPress content pages MUST be:
  - Server Components
  - Rendered using ISR (Incremental Static Regeneration)

### 3.2 Cache Mechanism
- **Next.js fetch cache with TAGS is the ONLY primary cache**
- Time-based revalidation alone (`revalidate: 300`) is NOT sufficient

### 3.3 Required Tag Convention

| Content Type | Tag Format |
|-------------|-----------|
| Home | `home:{edition}` |
| Edition | `edition:{edition}` |
| Category | `category:{edition}:{slug}` |
| Article | `post:{edition}:{postId}` |
| Author | `author:{edition}:{slug}` |
| Tag | `tag:{edition}:{slug}` |

**Rules**
- Article tags MUST use postId (not slug)
- Tags MUST be stable across deployments

---

## 4. Revalidation Contract (WordPress → Next.js)

### 4.1 Webhook Requirement
- WordPress MUST send a webhook on:
  - publish
  - update
  - delete
  - category change

### 4.2 Revalidation Endpoint
- Endpoint: `/api/revalidate`
- Method: `POST` only
- Auth: `x-revalidate-secret` header

### 4.3 Payload Contract
```json
{
  "event": "post_updated",
  "edition": "sz",
  "postId": 123,
  "slug": "article-slug",
  "categories": ["politics", "local"],
  "tags": ["breaking", "government"]
}
```

### 4.4 Revalidation Rules
- Next.js MUST call `revalidateTag()` ONLY
- `revalidatePath()` is OPTIONAL and discouraged
- No wildcard or global revalidation allowed

---

## 5. Data Layer Contract

### 5.1 Folder Structure (MANDATORY)
```
lib/
  wordpress/
    client.ts          # fetchGraphQL() with tags
    queries.ts         # GraphQL queries ONLY
    mappers.ts         # WPGraphQL → UI transforms
    errors.ts          # Typed errors
```

### 5.2 Responsibilities
- `client.ts`
  - fetchGraphQL()
  - timeout handling
  - fetch tags applied here
- `queries.ts`
  - GraphQL queries ONLY
- `mappers.ts`
  - Transforms WPGraphQL → UI models
- `errors.ts`
  - Typed errors (notFound vs transport vs auth)

### 5.3 Forbidden
- ❌ Inline GraphQL queries inside page components
- ❌ Silent null returns on fetch failure
- ❌ Multiple caching layers for WordPress data

---

## 6. Error Handling Contract

### 6.1 Content vs Transport
- Transport errors (timeouts, 5xx) MUST NOT be treated as `notFound()`
- Only genuine "content missing" results may return 404

### 6.2 Fallback Rule
- Optional `stale-if-error` fallback allowed
- Fallback MUST:
  - Be server-only
  - Never override primary cache truth

---

## 7. Client / Server Boundary Enforcement

### 7.1 Environment Variables
- WordPress secrets MUST be server-only
- Client code may only access `NEXT_PUBLIC_*`

### 7.2 Supabase
- One browser client singleton ONLY
- No Supabase client creation inside components

### 7.3 Cache Utilities
- `unstable_cache` MUST be in `lib/server/*` with `"server-only"` import

---

## 8. Comments & Interactions

- Comments, bookmarks, likes:
  - Are dynamic (no-store)
  - Served via API routes
  - Stored in Supabase
- WordPress is NOT used for interactions

---

## 9. Prohibited Practices (Hard Fail)

Any PR or generated code that includes the following MUST be rejected:

- Multiple caching layers for WordPress content
- REST + GraphQL hybrid rendering
- Time-only revalidation for articles
- Client-side WordPress fetching
- Global cache invalidation
- WordPress secrets in client bundles
- Arrow functions with generic parameters in server actions (`const fn = <T>() => {}`)

---

## 10. Change Control

Any change to this contract requires:
- Version bump
- Explicit approval
- Migration plan

This document is the source of truth.
