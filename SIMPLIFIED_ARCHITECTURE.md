# News on Africa - Simplified Architecture

## Edition Support

**Supported:** 3 editions only
- `sz` - Eswatini
- `za` - South Africa  
- `ng` - Nigeria

**Removed completely:**
- `ke` (Kenya)
- `eg` (Egypt)
- `tz` (Tanzania)
- `gh` (Ghana)

---

## Environment Configuration

### Required Variables

```env
# WordPress GraphQL endpoints (one per edition)
NEXT_PUBLIC_WP_SZ_GRAPHQL=https://newsonafrica.com/sz/graphql
NEXT_PUBLIC_WP_ZA_GRAPHQL=https://newsonafrica.com/za/graphql
NEXT_PUBLIC_WP_NG_GRAPHQL=https://newsonafrica.com/ng/graphql

# Default edition (optional, defaults to "sz")
NEXT_PUBLIC_DEFAULT_SITE=sz

# Webhook secret for ISR revalidation
WORDPRESS_WEBHOOK_SECRET=your-secure-secret-here
```

### Validation

- `config/env.ts` validates only the 3 required env vars
- Uses `.passthrough()` to ignore extra env vars (allows legacy env to exist without breaking)
- Type-safe with Zod schema: `z.enum(["sz", "za", "ng"])`

---

## Country Code Validation

### Helper: `lib/countries.ts`

```typescript
export type CountryCode = "sz" | "za" | "ng"

export function isValidCountry(code: string): code is CountryCode {
  return SUPPORTED_CODES.includes(code as CountryCode)
}

export function getGraphQLEndpoint(countryCode: CountryCode): string {
  const envKey = `NEXT_PUBLIC_WP_${countryCode.toUpperCase()}_GRAPHQL`
  const endpoint = process.env[envKey]
  
  if (!endpoint) {
    throw new Error(`Missing environment variable: ${envKey}`)
  }
  
  return endpoint
}
```

---

## GraphQL Client

### `lib/graphql-client.ts`

Features:
- **Error expansion:** Prints actual error messages, not `{...}`
- **ISR tags:** Automatic tag-based revalidation
  - `country-${countryCode}`
  - Custom tags via options
- **Type-safe:** Generic `<T>` for response shape
- **One-line usage:**

```typescript
const post = await fetchGraphQL<Post>("sz", POST_QUERY, { slug })
```

---

## ISR Revalidation

### Endpoint: `POST /api/revalidate`

**Request:**
```json
{
  "secret": "WORDPRESS_WEBHOOK_SECRET",
  "countryCode": "sz",
  "slug": "article-slug"
}
```

**Revalidated tags:**
- `article-${slug}-${countryCode}`
- `country-${countryCode}`

**OR use header:**
```bash
curl -X POST https://yoursite.com/api/revalidate \
  -H "X-Revalidate-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "za",
    "slug": "breaking-news"
  }'
```

---

## Routing Guards

### In Route Files

```typescript
import { notFound } from "next/navigation"
import { isValidCountry } from "@/lib/countries"

export default async function Page({ 
  params 
}: { 
  params: Promise<{ countryCode: string }> 
}) {
  const { countryCode } = await params
  
  if (!isValidCountry(countryCode)) {
    notFound()
  }
  
  // Safe to use countryCode as CountryCode type
}
```

---

## Files Changed

### Simplified
- `config/env.ts` - Only 3 env vars, no complex validation
- `app/api/revalidate/route.ts` - Removed rate limiting, validation errors, CORS
- `app/layout.tsx` - Added `suppressHydrationWarning` for browser extensions

### New
- `lib/countries.ts` - Central country validation
- `lib/graphql-client.ts` - Clean GraphQL fetcher with ISR support

### Next Steps (Update if exists)
- Replace imports in article routes to use `lib/graphql-client.ts`
- Use `isValidCountry()` in middleware/route handlers
- Test revalidation endpoint with WordPress webhook

---

## Validation Removed

❌ **Removed:**
- URL path suffix validation (e.g., "must end with /sz/graphql")
- Complex preprocessing logic
- Legacy edition references (tz, gh, ke, eg)
- Over-engineered error classes
- Rate limiting on revalidation
- CORS wrapper logic

✅ **Kept:**
- Type safety (Zod + TypeScript)
- Error messages (explicit, readable)
- Webhook verification (secret check)
- ISR tag strategy
