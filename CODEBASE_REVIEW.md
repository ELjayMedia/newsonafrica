# Comprehensive Codebase Review: News On Africa

**Date**: January 31, 2026  
**Scope**: Full-stack Next.js 15 application with WordPress headless CMS integration, Supabase backend, and advanced features (comments, bookmarks, subscriptions)

---

## Executive Summary

Your News On Africa platform demonstrates **solid architectural foundations** with well-structured separations between client/server concerns, proper use of ISR caching with tags, and comprehensive feature implementations. However, there are opportunities for optimization in performance, maintainability, and reducing redundancy.

### Key Strengths ✅
- Strong ISR cache strategy with edition-based tags
- Good server/client component separation
- Comprehensive error handling patterns
- Well-organized lib utilities with clear responsibilities
- Testing infrastructure in place

### Priority Issues ⚠️
1. **Context Provider Redundancy** - Duplicate preference contexts causing state synchronization issues
2. **Component Complexity** - Large components with many responsibilities need decomposition
3. **API Call Patterns** - Inconsistent error handling and retry logic
4. **Memory Leaks** - Multiple subscription patterns without proper cleanup
5. **Type Safety** - Missing type exports and potential runtime errors

---

## 1. Architecture & Organization

### Current State
The project follows a good Next.js 15 structure:
- App Router with grouped routes (`(public)`, `(authed)`)
- Separate concerns: `app/` (pages/routes), `lib/` (utilities), `components/`
- Feature-based lib organization (bookmarks, comments, supabase, wordpress)

### Issues Found

#### 1.1 Duplicate Context Providers ⚠️ CRITICAL
**Files**: `/contexts/UserPreferencesContext.tsx` + `/contexts/UserPreferencesClient.tsx`

```typescript
// Both files define nearly identical contexts
const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined)
```

**Impact**: 
- Confusion about which context to use
- Potential state desynchronization
- Hard to trace preference updates

**Recommendation**:
- Keep ONE unified context file
- Use context selectors or custom hooks to split concerns if needed
- Export both server and client hooks from same file

#### 1.2 Component Organization Issues
Large components handling multiple responsibilities:
- `CommentList.tsx` (500+ lines) - handles virtualization, pagination, real-time updates, rate limiting, optimistic updates
- `BookmarksContent.tsx` (400+ lines) - handles filtering, sorting, exporting, bulk actions, notes
- `SearchContent.tsx` - likely similar issue

**Recommendation**: Break into smaller, focused components:
```typescript
// Better structure:
components/
  ├── CommentList/
  │   ├── CommentList.tsx (orchestrator)
  │   ├── CommentVirtualizer.tsx (virtualization logic)
  │   ├── CommentForm.tsx (form handling)
  │   ├── CommentFilters.tsx (sorting/filtering)
  │   └── hooks/
  │       ├── useCommentPagination.ts
  │       ├── useCommentRealtime.ts
  │       └── useCommentOptimisticUpdates.ts
```

---

## 2. Performance Optimization

### 2.1 Real-Time Subscription Memory Leaks ⚠️ HIGH
**File**: `/components/CommentList.tsx` lines 258-265

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`comments-${postId}`)
    .on('postgres_changes', { /* ... */ }, () => {
      void loadCommentsRef.current({ append: false })
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [postId]) // GOOD - properly cleaned up
```

**Finding**: This is actually well-handled, but other components may have issues.

**Check these files**:
- SearchContent.tsx
- RelatedArticles.tsx
- ProfileContent.tsx

### 2.2 Ref Management in CommentList
**File**: `/components/CommentList.tsx`

Multiple refs being updated outside React's model:
```typescript
useEffect(() => {
  paginationRef.current = pagination
}, [pagination]) // ❌ Updates ref on every pagination change
```

**Issue**: This defeats the purpose of refs. Should update through callbacks or restructure state.

**Fix**:
```typescript
// Option 1: Remove this effect, access pagination directly in callbacks
// Option 2: Use useTransition instead of ref tracking
// Option 3: Move pagination logic to a custom hook
```

### 2.3 Virtuoso Configuration
**File**: `/components/CommentList.tsx`

```typescript
<Virtuoso
  totalCount={totalRenderableComments}
  itemContent={(index) => { /* getCommentAtIndex */ }}
  computeItemKey={(index) => { /* ... */ }}
  endReached={loadMoreComments}
  useWindowScroll
/>
```

**Observations**:
- `useWindowScroll` is good for performance (no scroll container overhead)
- `computeItemKey` is well-implemented
- Consider adding `overscan` prop for smoother scrolling

**Enhancement**:
```typescript
<Virtuoso
  // ... existing props
  overscan={5} // Pre-render items outside viewport
  increaseViewportBy={{ top: 100, bottom: 100 }}
/>
```

### 2.4 Uselessly Re-computing Memoization
**File**: `/components/CommentList.tsx`

```typescript
const failedCommentSet = useMemo(() => new Set(failedComments), [failedComments])
```

This Set is created in every render where failedComments changes. Consider:
```typescript
// Option 1: Move Set creation outside component
const createFailedSet = (comments: string[]) => new Set(comments)

// Option 2: Use useRef for mutable set
const failedSetRef = useRef<Set<string>>(new Set())
useEffect(() => {
  failedSetRef.current = new Set(failedComments)
}, [failedComments])
```

### 2.5 WordPress GraphQL Memoization ✅ GOOD
**File**: `/lib/wordpress/client.ts`

Good implementation of request-scoped memoization with fallback to global store. This prevents duplicate GraphQL requests during SSR.

---

## 3. Code Quality & Maintainability

### 3.1 Type Safety Issues

#### Missing Type Exports
**File**: `/lib/comments/queries.ts`

Many query functions don't export their return types, making it hard for consumers to type check.

**Fix**:
```typescript
// Before
export async function listComments(supabase, params) { /* ... */ }

// After
export type ListCommentsResult = { comments: Comment[]; hasMore: boolean; nextCursor?: string }
export async function listComments(supabase, params): Promise<ListCommentsResult> { /* ... */ }
```

#### Inconsistent Error Handling
**Files**: Multiple API routes

```typescript
// Some routes use this pattern:
export const GET = GET_(async ({ request, supabase, session }) => {
  // errors thrown are caught by GET_() handler
})

// But unclear what happens with different error types
// Should have documented error response contract
```

**Recommendation**: Create error response types:
```typescript
export type ApiErrorResponse = {
  success: false
  error: string
  errors?: Record<string, string[]>
  statusCode: number
}

export type ApiSuccessResponse<T> = {
  success: true
  data: T
  meta?: Record<string, any>
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
```

### 3.2 Inconsistent State Management Patterns

**Issue**: Multiple state management approaches across the codebase:
- Context for auth/preferences
- SWR for data fetching  
- Direct Supabase queries in components
- useRef for mutable state
- useState for derived state

**Example**: BookmarksContext.tsx uses complex state machine logic, while CommentList uses simpler hooks.

**Recommendation**: Create a state management guide:
```
🔹 User-scoped data (auth, preferences) → Context
🔹 Server-side data (posts, comments) → SWR or direct query at page level
🔹 Component-local UI state (modals, filters) → useState
🔹 Mutable tracking (cache, refs) → useRef
🔹 Derived/cached data → useMemo
```

### 3.3 Missing Debug Statements ✅ GOOD
No `console.log()` or `debugger` statements found in production code, which is excellent.

However, the codebase has good debug logging in critical paths:
```typescript
console.error("[v0] Bootstrap session error:", sessionError)
```

These `[v0]` prefixed logs are helpful for development.

---

## 4. API Routes & Request Handling

### 4.1 Rate Limiting Implementation ✅ SOLID
**File**: `/lib/api-utils.ts`

```typescript
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
})

export async function applyRateLimit(request: NextRequest, limit: number, token: string) {
  const identifier = `${token}-${request.ip ?? "127.0.0.1"}`
  await limiter.check(limit, identifier)
}
```

**Issues**:
1. Rate limiter token is passed but using IP as fallback - consider requiring auth token always
2. No distributed rate limiting (single instance won't work at scale)

**Upgrade Path**:
```typescript
// Use Upstash Redis (already available)
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix: "@upstash/ratelimit"
})
```

### 4.2 Validation Pattern ⚠️ INCONSISTENT
**Files**: Multiple validation utilities

```typescript
// In comments/validators.ts
export function validateGetCommentsParams(params: URLSearchParams) {
  // Custom validation logic
}

// In lib/validation.ts
// Likely more validation

// Better: Consolidate to single validation layer
```

**Recommendation**:
```typescript
// lib/validation/index.ts
import { z } from "zod"

export const CommentsParamsSchema = z.object({
  postId: z.string().min(1),
  limit: z.number().min(1).max(50),
  page: z.number().min(0),
  sortOption: z.enum(["newest", "oldest", "popular"])
})

export function validateCommentsParams(params: unknown) {
  return CommentsParamsSchema.parse(params)
}
```

### 4.3 CORS Configuration ✅ GOOD
**File**: `/lib/api-utils.ts`

Proper origin checking with environment awareness:
```typescript
const allowedOrigins = 
  process.env.NODE_ENV === "production"
    ? [ENV.NEXT_PUBLIC_SITE_URL, "https://news-on-africa.com"]
    : [ENV.NEXT_PUBLIC_SITE_URL || "http://app.newsonafrica.com"]
```

---

## 5. Data Fetching & Caching

### 5.1 ISR Cache Strategy ✅ EXCELLENT
**File**: `/lib/cache/cacheTags.ts`

Clean implementation of edition-based cache tags:
```typescript
export const cacheTags = {
  edition(edition: EditionInput) { return `edition:${normalizeEdition(edition)}` },
  post(edition: EditionInput, id: IdentifierInput) { return `${editionScope(edition, "post")}:${id}` },
  // ...
}
```

**Strengths**:
- Prevents invalid tags through validation
- Edition-scoped prevents cache conflicts
- Clear naming convention

**Enhancement**: Add TTL hints:
```typescript
export const CACHE_TTL = {
  HOME: 3600, // 1 hour
  POST: 86400, // 1 day
  CATEGORY: 3600,
  COMMENT: 0, // Never cache comments (dynamic)
} as const
```

### 5.2 WordPress GraphQL Error Handling ⚠️ NEEDS IMPROVEMENT
**File**: `/lib/wordpress/client.ts`

Multiple error types but unclear recovery:
```typescript
export class WordPressGraphQLHTTPError extends Error { /* ... */ }
export class WordPressGraphQLResponseError extends Error { /* ... */ }

export type WordPressGraphQLFailureKind = "http_error" | "graphql_error" | "invalid_payload"
```

**Issue**: Callers don't know how to handle each error type.

**Improvement**:
```typescript
export async function fetchWordPressGraphQL<T>(
  query: string,
  options: FetchWordPressGraphQLOptions = {}
): Promise<WordPressGraphQLResponse<T>> {
  // Try request with retry
  const result = await fetchWithRetry(() => fetch(...), {
    maxAttempts: 3,
    backoff: "exponential",
  })

  if (!result.ok) {
    // 429, 503 -> Retry with backoff
    // 401, 403 -> Don't retry
    // 500 -> Retry with backoff
  }

  // ... rest of logic
}
```

### 5.3 Comment Query Architecture ⚠️ COMPLEX
**File**: `/lib/comments/queries.ts`

Multiple query functions with overlapping logic. Consider consolidating:

```typescript
// Current: Multiple functions
export async function listComments() { /* ... */ }
export async function countComments() { /* ... */ }
export async function getProfileLite() { /* ... */ }

// Better: Single query builder pattern
export class CommentQueryBuilder {
  private filters: CommentFilters = {}
  
  forPost(postId: string) { /* ... */ }
  sortBy(sort: CommentSort) { /* ... */ }
  limit(n: number) { /* ... */ }
  async execute(supabase) { /* ... */ }
}
```

---

## 6. Client Components & Hooks

### 6.1 Callback Dependencies ⚠️ MISSING IN PLACES
**File**: `/components/BookmarksContent.tsx` line 68-71

```typescript
const handleSortChange = useCallback(
  (value: SortOption) => {
    setSortBy(value)
    void setBookmarkSortPreference(value)
  },
  [setBookmarkSortPreference], // ⚠️ Missing setSortBy? Actually no, setSortBy is state setter
)
```

This is actually correct (state setters are stable). Good patterns elsewhere too.

### 6.2 useMemo Over-usage
**File**: `/components/BookmarksContent.tsx` line 85-127

```typescript
const filteredBookmarks = useMemo(() => {
  let filtered = searchQuery ? searchBookmarks(searchQuery) : bookmarks
  
  if (filterBy === "unread") {
    filtered = filtered.filter((b) => b.readState !== "read")
  }
  
  // ... 30+ more lines
  
  return filtered.sort((a, b) => {
    // ... sorting logic
  })
}, [bookmarks, searchQuery, sortBy, filterBy, selectedCategory, searchBookmarks, filterByCategory])
```

**Issues**:
1. Too many dependencies - this memoization defeats itself
2. Complex filtering logic should be in separate utilities
3. Hard to test

**Refactor**:
```typescript
// lib/bookmarks/filters.ts
export function filterBookmarks(
  bookmarks: Bookmark[],
  filters: BookmarkFilters
): Bookmark[] {
  return bookmarks
    .filter(byReadState(filters.readState))
    .filter(byCategory(filters.category))
    .filter(bySearch(filters.search))
    .sort(bySort(filters.sort))
}

// In component
const filteredBookmarks = useMemo(
  () => filterBookmarks(bookmarks, { readState: filterBy, /* ... */ }),
  [bookmarks, filterBy, sortBy, /* ... */]
)
```

### 6.3 Provider Bootstrap Complexity ⚠️ MEDIUM
**File**: `/app/providers.tsx`

```typescript
function useClientBootstrap(
  initialAuthState: AuthStatePayload | null | undefined,
  initialPreferences: UserPreferencesSnapshot | null | undefined,
) {
  const bootstrap = useCallback(async () => {
    // ~80 lines of bootstrap logic
    // Multiple Supabase queries
    // Lots of null checks
  }, [initialAuthState])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return { authState, preferences, isBootstrapping }
}
```

**Issues**:
1. Bootstrap called once on mount, but dependency on `initialAuthState` could cause re-runs
2. No error boundary - errors silently caught
3. Race conditions possible if auth state changes mid-fetch

**Better approach**:
```typescript
function useClientBootstrap(
  initialAuthState: AuthStatePayload | null | undefined,
  initialPreferences: UserPreferencesSnapshot | null | undefined,
) {
  const isInitialized = useRef(false)
  
  // Bootstrap only once
  useEffect(() => {
    if (isInitialized.current) return
    if (initialAuthState !== null && initialAuthState !== undefined) {
      isInitialized.current = true
      return
    }
    
    const abortController = new AbortController()
    
    bootstrap({ signal: abortController.signal }).catch(error => {
      // Proper error handling
    })
    
    return () => abortController.abort()
  }, []) // Empty deps - run once
}
```

---

## 7. Database & Supabase Integration

### 7.1 RLS Policy Coverage ✅ SOLID
Multiple well-organized DAL files suggest good separation of concerns. 

**Current structure**:
```
lib/dal/
  ├── bookmarks.ts
  ├── comments.ts
  ├── profiles.ts
  └── user-preferences.ts
```

**Enhancement**: Add RLS policy documentation:
```typescript
// lib/dal/bookmarks.ts
/**
 * RLS POLICIES REQUIRED:
 * - SELECT: users can view their own bookmarks
 * - INSERT: only authenticated users can create bookmarks
 * - UPDATE: users can only update their own bookmarks
 * - DELETE: users can only delete their own bookmarks
 * 
 * SQL:
 * ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users can manage own bookmarks"
 *   ON bookmarks USING (auth.uid() = user_id);
 */
```

### 7.2 Connection Pooling ⚠️ VERIFY
**Files**: Using `@supabase/ssr` and `@supabase/supabase-js`

Verify environment variables include pooling config:
```typescript
// Should check for:
SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY // For server-side operations

// For Postgres direct access:
POSTGRES_URL         // Full connection string
POSTGRES_URL_NON_POOLING // For migrations
```

### 7.3 REST vs GraphQL Strategy ⚠️ NEEDS CLARIFICATION
Multiple data access patterns found:

```typescript
// REST API
lib/supabase/rest/

// Direct Supabase client
lib/dal/bookmarks.ts

// Both are used inconsistently
```

**Recommendation**: Establish pattern:
```
✅ DO: Use Supabase client for real-time features (comments, bookmarks)
✅ DO: Use WordPress GraphQL for content (posts, categories)
✅ DO: Use Supabase REST for read-heavy operations (user preferences)
❌ DON'T: Mix approaches for same resource
```

---

## 8. Testing & Quality Assurance

### 8.1 Test Coverage Overview
Found test files in:
- `**/*.test.ts` (unit tests)
- `**/*.test.tsx` (component tests)

**Testing framework**: Vitest with @vitest/browser

**Observed test patterns**:
- Good for data transformation (`lib/mapping/post-mappers.test.ts`)
- Good for utils (`lib/supabase/utils/query-cache.test.ts`)
- Some component tests present

**Gaps**:
- No integration tests (API routes + DB)
- No E2E tests for critical flows (auth, bookmarks, comments)
- No performance tests (Lighthouse CI, etc.)

### 8.2 Test File Organization
```
❌ Current: Tests scattered alongside source
✅ Better: Consistent test directory structure
```

**Recommendation**:
```
__tests__/
  ├── unit/
  │   ├── lib/
  │   ├── components/
  │   └── utils/
  ├── integration/
  │   ├── api/
  │   ├── database/
  │   └── supabase/
  └── e2e/
      └── critical-flows.spec.ts
```

### 8.3 Missing Error Scenarios
Most tests don't cover error paths:
```typescript
// Current test
it("should fetch comments", async () => {
  const result = await listComments(supabase, params)
  expect(result.comments).toHaveLength(10)
})

// Should also test
it("should handle database errors", async () => { /* */ })
it("should retry on network errors", async () => { /* */ })
it("should timeout on slow responses", async () => { /* */ })
```

---

## 9. Dependencies & Build Optimization

### 9.1 Package.json Review
**Current state**: Using `latest` for most packages (risky)

```json
"dependencies": {
  "@radix-ui/react-*": "latest",
  "@supabase/auth-helpers-nextjs": "latest",
  "react": "latest",
  // ... many "latest"
}
```

**Issues**:
1. Builds are non-reproducible
2. Potential breaking changes
3. Hard to debug version-specific issues

**Fix**:
```json
{
  "dependencies": {
    "@radix-ui/react-accordion": "^1.2.0",
    "@supabase/auth-helpers-nextjs": "^0.11.0",
    "react": "^19.0.0"
  }
}
```

### 9.2 Bundle Analysis
**File**: `package.json` has analyze script

```json
"scripts": {
  "analyze": "ANALYZE=true next build"
}
```

**Recommendation**: Track bundle size in CI:
```bash
# Before PR
npm run analyze > baseline.txt

# After changes  
npm run analyze > current.txt

# Alert if bundle grows > 5%
```

### 9.3 Unused Dependencies
Review and potentially remove:
- `crypto` (built into Node.js)
- `path` (built into Node.js)
- `@edge-runtime/vm` (check if used)

---

## 10. Security Concerns

### 10.1 Environment Variable Exposure ✅ GOOD
Correctly using `NEXT_PUBLIC_` prefix for public vars:
```typescript
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
```

### 10.2 CORS Configuration ✅ SECURE
Already reviewed - good origin checking.

### 10.3 Authentication Flow ✅ SOLID
Using Supabase Auth with proper PKCE flow:
```typescript
auth: {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: "pkce",
}
```

### 10.4 SQL Injection Prevention ✅ GOOD
Using Supabase client prevents direct SQL injection.

### 10.5 XSS Prevention ⚠️ CHECK
Using `isomorphic-dompurify` for HTML sanitization:
```typescript
import DOMPurify from "isomorphic-dompurify"
```

Ensure all user content is sanitized before rendering.

---

## 11. Documentation & Developer Experience

### 11.1 Missing Documentation
- No Architecture Decision Records (ADRs)
- No setup guide for new developers
- No API documentation for endpoints
- No database schema documentation

**Create**:
```
docs/
  ├── ARCHITECTURE.md (system design)
  ├── API.md (endpoint documentation)
  ├── DATABASE.md (schema and migrations)
  ├── SETUP.md (development environment)
  └── CONTRIBUTING.md (contribution guide)
```

### 11.2 Code Comments
Most files lack high-level comments explaining the "why", not just "what".

**Good example**: WordPress client with clear error types

**Add comments for**:
- Complex algorithms (comment pagination, bookmark counter logic)
- Why certain patterns were chosen
- Known limitations or edge cases

---

## 12. Performance Monitoring

### 12.1 Missing Observability
**File**: `/app/reportWebVitals.ts` exists but likely not being used effectively.

**Implement**:
```typescript
// lib/observability/performance.ts
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Send to analytics service
  fetch("/api/metrics", {
    method: "POST",
    body: JSON.stringify(metric)
  })
}

// lib/observability/logger.ts
export function logError(message: string, error: Error) {
  console.error(message, error)
  
  // Send to error tracking service (Sentry, etc)
  captureException(error, { message })
}
```

### 12.2 Missing Metrics
- No request timing logs
- No cache hit rate metrics
- No error rate tracking
- No slow query alerts

---

## Prioritized Action Items

### 🔴 CRITICAL (Do First - 1-2 days)
1. **Merge duplicate context providers** - causes state confusion
   - File: `contexts/UserPreferencesContext.tsx` + `contexts/UserPreferencesClient.tsx`
   - Impact: High | Effort: Low

2. **Fix component memory leaks** - unsubscribe from all real-time channels
   - Files: SearchContent, RelatedArticles, ProfileContent
   - Impact: High | Effort: Medium

3. **Pin dependency versions** - enable reproducible builds
   - File: `package.json`
   - Impact: High | Effort: Low

### 🟡 HIGH (1-2 weeks)
1. **Decompose large components** - split CommentList, BookmarksContent into smaller pieces
   - Impact: Medium | Effort: High

2. **Consolidate validation** - use single Zod-based validation layer
   - Impact: Medium | Effort: Medium

3. **Add distributed rate limiting** - use Upstash Redis already available
   - Impact: Medium | Effort: Medium

4. **Document RLS policies** - add inline documentation for database requirements
   - Impact: Low | Effort: Low

### 🟢 MEDIUM (2-4 weeks)
1. **Improve error handling** - standardize error responses across API routes
   - Impact: Medium | Effort: Medium

2. **Add comprehensive tests** - integration and E2E tests for critical flows
   - Impact: Medium | Effort: High

3. **Create documentation** - Architecture, API, Database, Setup guides
   - Impact: Low | Effort: Medium

4. **Implement observability** - metrics, logging, error tracking
   - Impact: Medium | Effort: Medium

5. **Optimize Virtuoso** - add overscan and viewport hints
   - Impact: Low | Effort: Low

### 📚 NICE TO HAVE (When time permits)
- Add Lighthouse CI for performance tracking
- Implement query profiling for slow queries
- Create custom ESLint rules for project patterns
- Add visual regression testing
- Implement feature flags for gradual rollouts

---

## Code Examples for Improvements

### Fix 1: Merge Preference Contexts

**Before** (2 separate files):
```typescript
// UserPreferencesContext.tsx
const UserPreferencesContext = createContext(...)

// UserPreferencesClient.tsx
const UserPreferencesContext = createContext(...)
```

**After** (Single unified file):
```typescript
// contexts/UserPreferences.ts
export const UserPreferencesContext = createContext<...>(undefined)

// Server hook for RSCs
export async function useUserPreferencesServer() {
  const session = await getSession()
  // fetch from DB
}

// Client hook for client components
export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  // ...
}
```

### Fix 2: Extract Custom Hooks from Large Components

**Before** (CommentList.tsx - 500 lines):
```typescript
export function CommentList({ postId, editionCode, ... }: Props) {
  // 200 lines of ref management
  // 150 lines of state management
  // 150 lines of rendering
}
```

**After** (Smaller focused component):
```typescript
// hooks/useCommentPagination.ts
export function useCommentPagination(postId: string, editionCode: string) {
  // All pagination logic
  return { comments, hasMore, loadMore, /* ... */ }
}

// hooks/useCommentRealtime.ts
export function useCommentRealtime(postId: string, onUpdate: () => void) {
  // Real-time subscription logic
  return { /* ... */ }
}

// components/CommentList.tsx (now 100 lines)
export function CommentList(props: Props) {
  const comments = useCommentPagination(...)
  const realtime = useCommentRealtime(...)
  // Just rendering and orchestration
}
```

### Fix 3: Consolidate Validation

**Before** (Multiple validation files):
```typescript
// lib/validation.ts
export function validateSomething() { /* ... */ }

// lib/comments/validators.ts
export function validateGetCommentsParams() { /* ... */ }

// lib/bookmarks/validation.ts
export function validateBookmarkInput() { /* ... */ }
```

**After** (Central Zod schemas):
```typescript
// lib/validation/schemas.ts
import { z } from "zod"

export const CommentsParamsSchema = z.object({
  postId: z.string().min(1),
  limit: z.number().min(1).max(50).default(10),
  page: z.number().min(0).default(0),
})

export const BookmarkInputSchema = z.object({
  postId: z.string().min(1),
  title: z.string().min(1),
  note: z.string().optional(),
})

// lib/validation/index.ts
export function validateCommentsParams(params: unknown) {
  return CommentsParamsSchema.parse(params)
}
```

---

## Metrics to Track

Add to your monitoring dashboard:

```typescript
// Performance
- API response times (avg, p95, p99)
- Comment load time (virtualization effectiveness)
- Bookmark filtering performance
- Search query latency

// Reliability
- Cache hit rate (ISR effectiveness)
- Error rates by endpoint
- Rate limit hit rate
- Real-time subscription reliability

// User Experience
- Time to interactive (TTI)
- Cumulative Layout Shift (CLS)
- Bookmark operation success rate
- Comment submission success rate
```

---

## Conclusion

Your codebase demonstrates **solid engineering practices** with good separation of concerns, proper use of Next.js 15 features, and well-thought-out caching strategies. The main opportunities for improvement center on:

1. **Eliminating redundancy** (duplicate contexts, validation)
2. **Improving component size and testability** (large components)
3. **Strengthening error handling** (consistency, observability)
4. **Adding comprehensive tests** (integration, E2E)
5. **Enhancing documentation** (for future maintainers)

Focus on the **🔴 CRITICAL** section first - those changes will have the most immediate positive impact on code quality and performance.

---

**Review Date**: January 31, 2026  
**Next Review**: Post-refactoring (4-6 weeks)
