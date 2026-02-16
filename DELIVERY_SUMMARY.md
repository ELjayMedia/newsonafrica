# Simplified News on Africa - Clean System Delivery

## Changes Summary

### ✅ Environment Configuration (FIXED)

**File:** `config/env.ts`

- Removed complex validation that checked for tz/gh endpoint suffixes
- Simplified to 3 env vars only: `NEXT_PUBLIC_WP_SZ_GRAPHQL`, `NEXT_PUBLIC_WP_ZA_GRAPHQL`, `NEXT_PUBLIC_WP_NG_GRAPHQL`
- Added `.passthrough()` to allow legacy env vars without breaking
- Uses `z.enum(["sz", "za", "ng"])` for country validation

### ✅ Country Validation (NEW)

**File:** `lib/countries.ts`

- Type guard: `isValidCountry(code: string): code is CountryCode`
- Endpoint resolver: `getGraphQLEndpoint(countryCode: CountryCode)`
- Simple, no-nonsense country list

### ✅ GraphQL Client (NEW)

**File:** `lib/graphql-client.ts`

- Clean fetcher: `fetchGraphQL<T>(countryCode, query, variables, options)`
- Expands errors (shows actual message, not `{...}`)
- Automatic ISR tags: `country-${countryCode}`
- Type-safe response handling

### ✅ Webhook Revalidation (SIMPLIFIED)

**File:** `app/api/revalidate/route.ts`

- Removed: rate limiting, CORS wrapper, error classes, action parsing
- Kept: secret verification, tag revalidation, country validation
- Cleaner implementation (~50 lines vs 180)

### ✅ Hydration Warning (FIXED)

**File:** `app/layout.tsx`

- Added `suppressHydrationWarning` to `<html>` tag
- Silences Grammarly browser extension mismatch
- Fixed hardcoded metadata base URL

---

## What's NO LONGER NEEDED

❌ `config/wp.ts` - Can be removed (logic moved to graphql-client)
❌ Legacy country routes (ke, eg, tz, gh)
❌ lib/wp-endpoints.ts - Over-engineered endpoint resolver
❌ Complex country maps with 7+ editions
❌ Middleware routes checking for non-existent countries

---

## Next Build

When you rebuild:

1. Cache clears automatically (Next.js detects env.ts changes)
2. `isValidCountry()` guards all routes
3. GraphQL fetcher expands error messages
4. Revalidation endpoint is secure and simple
5. No hydration warnings from extensions

---

## Testing Checklist

- [ ] Article loads with correct country code
- [ ] Invalid country codes return 404
- [ ] GraphQL errors show actual message (not `{...}`)
- [ ] Webhook revalidation works: `POST /api/revalidate`
- [ ] Build succeeds without env var validation errors
- [ ] Home page hydrates without console warnings
