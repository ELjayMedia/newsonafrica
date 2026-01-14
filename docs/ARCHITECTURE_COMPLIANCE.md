# Architecture Contract Compliance Guide

This document helps developers and AI assistants ensure code complies with `ARCHITECTURE_CONTRACT.md`.

## Pre-Commit Checklist

Before committing any WordPress integration code, verify:

### ✅ Content Fetching
- [ ] Uses WPGraphQL (not REST) as primary API
- [ ] GraphQL queries are in `lib/wordpress/queries.ts`
- [ ] No inline GraphQL in page components
- [ ] Server Components only (no client-side WordPress fetching)

### ✅ Caching
- [ ] Uses Next.js fetch cache with tags
- [ ] Cache tags follow convention: `{type}:{edition}:{id}`
- [ ] No multiple caching layers
- [ ] No time-only revalidation for content pages

### ✅ Revalidation
- [ ] Webhook payload matches contract schema
- [ ] Only uses `revalidateTag()` (not `revalidatePath()`)
- [ ] Secret verification implemented
- [ ] No global cache invalidation

### ✅ Client/Server Boundaries
- [ ] WordPress secrets only in server code
- [ ] Supabase browser client is singleton
- [ ] `unstable_cache` in `lib/server/*` with `"server-only"`
- [ ] No generic arrow functions in server actions

### ✅ Error Handling
- [ ] Transport errors don't trigger `notFound()`
- [ ] Only genuine missing content returns 404
- [ ] Error types are explicit (transport vs content)

## v0.dev Instructions

When using v0.dev to generate or refactor code:

**Required Prompt Addition:**
```
You MUST follow ARCHITECTURE_CONTRACT.md strictly. Do not:
- Use WordPress REST for content rendering
- Create multiple cache layers
- Use time-only revalidation
- Fetch WordPress data from client components
- Use arrow functions with generics in server actions

Reference the contract before generating code.
```

## Common Violations and Fixes

### ❌ Violation: Time-only revalidation
```typescript
export const revalidate = 300 // DON'T
```

### ✅ Fix: Tag-based revalidation
```typescript
export const revalidate = 300 // Optional time-based fallback
// In fetch:
fetch(url, { next: { tags: [cacheTags.post(edition, postId)] } })
```

### ❌ Violation: REST + GraphQL mixing
```typescript
const post = await fetchGraphQL(query)
const comments = await fetch('/wp-json/wp/v2/comments') // DON'T
```

### ✅ Fix: Consistent GraphQL
```typescript
const post = await fetchGraphQL(query)
const comments = await fetchGraphQL(commentsQuery) // Only if needed
// Better: Use Supabase for comments
```

### ❌ Violation: Generic arrow function in server action
```typescript
const toSerializable = <T>(value: T): T => { ... } // DON'T
```

### ✅ Fix: Function declaration
```typescript
function toSerializable<T>(value: T): T { ... }
```

## Testing Compliance

Run these checks before deployment:

```bash
# Check for REST API usage in content pages
grep -r "wp-json" app/(public)

# Check for client-side WordPress fetching
grep -r "use client" app/ | xargs grep -l "fetchGraphQL"

# Check for missing cache tags
grep -r "fetch(" app/(public) | grep -v "next: { tags:"

# Check for unstable_cache outside lib/server
find lib -name "*.ts" -not -path "lib/server/*" | xargs grep -l "unstable_cache"
```

## Deployment Validation

Before merging to main:

1. WordPress webhook configured in production
2. `REVALIDATION_SECRET` set in Vercel
3. All content pages have ISR with tags
4. No WordPress secrets in client bundle
5. Supabase browser client is singleton

## Questions?

If unsure whether code complies:
1. Check relevant section in `ARCHITECTURE_CONTRACT.md`
2. Search for similar patterns in existing compliant code
3. Test with webhook to ensure revalidation works
