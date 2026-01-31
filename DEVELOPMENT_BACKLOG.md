# News On Africa - Development Backlog
**Created**: January 31, 2026  
**Organized by**: Priority → Impact → Effort  
**Format**: Goal | Files | Changes | Acceptance | Risk/Rollback

---

## 🔴 CRITICAL SPRINT (1–2 Days)

### 1. Merge Duplicate Context Providers
**Priority**: CRITICAL | **Impact**: HIGH | **Effort**: LOW

**Goal**: Eliminate state synchronization bugs by consolidating `UserPreferencesContext.tsx` and `UserPreferencesClient.tsx` into a single unified context with both server and client hooks.

**Files to Touch**:
- `contexts/UserPreferencesContext.tsx` (primary—keep this)
- `contexts/UserPreferencesClient.tsx` (delete)
- `app/providers.tsx` (update imports)
- Any files importing from `UserPreferencesClient.tsx` (update imports)

**Change List**:
- Copy non-duplicative logic from `UserPreferencesClient.tsx` into `UserPreferencesContext.tsx`
- Export both `useUserPreferences` (client hook) and `useUserPreferencesServer` (server hook) from unified context
- Update all imports across codebase to use single context file
- Verify preference state updates propagate correctly in both contexts
- Delete `UserPreferencesClient.tsx`

**Acceptance Criteria**:
- No duplicate context definitions remain in codebase
- All previous imports from `UserPreferencesClient.tsx` work identically from unified context
- No console errors about conflicting providers during app bootstrap
- Preference updates (e.g., sorting, filters) sync immediately across all consuming components
- All tests pass

**Risk/Rollback**:
- **Risk**: Merge error could break preference state if logic differs between files (mitigate: diff files before merging)
- **Rollback**: Revert commit; restore original two context files and revert all imports

---

### 2. Pin All `"latest"` Dependencies
**Priority**: CRITICAL | **Impact**: HIGH | **Effort**: LOW

**Goal**: Ensure reproducible builds and prevent breaking changes by pinning all dependencies to specific semver versions instead of `"latest"`.

**Files to Touch**:
- `package.json` (dependencies & devDependencies sections)

**Change List**:
- Replace all `"latest"` version strings with stable `^X.Y.Z` versions
- Run `pnpm install` to update `pnpm-lock.yaml`
- Verify no breaking changes in test suite
- Document version choices in PR description for future reference

**Acceptance Criteria**:
- Zero `"latest"` version strings in package.json
- `pnpm install` completes without errors
- All tests pass
- Build succeeds in CI/CD pipeline
- No deprecation warnings during install

**Risk/Rollback**:
- **Risk**: Pinned versions may lag behind security patches (mitigate: set up Dependabot for automated updates)
- **Rollback**: Restore package.json from git; run `pnpm install` to restore lock file

---

### 3. Fix Memory Leak in Ref Management (CommentList)
**Priority**: CRITICAL | **Impact**: HIGH | **Effort**: LOW

**Goal**: Eliminate unnecessary ref updates that defeat React's state model by consolidating pagination tracking into proper state or hooks.

**Files to Touch**:
- `components/CommentList.tsx` (lines with `paginationRef.current = pagination`)

**Change List**:
- Locate `useEffect` updating `paginationRef` on every pagination change
- Remove ref update effect (refs should be set once or used for mutable tracking only)
- Access `pagination` directly in callbacks or migrate to `useTransition` for async tracking
- Test pagination still works correctly (load more, infinite scroll)

**Acceptance Criteria**:
- No unused `useEffect` updating refs
- Pagination still loads additional comments correctly
- No memory leaks detected in React DevTools Profiler
- Scroll performance unchanged or improved
- All comment tests pass

**Risk/Rollback**:
- **Risk**: Removing ref update could break pagination logic if it depends on stale closure (mitigate: test manually before merge)
- **Rollback**: Revert the specific lines removing ref updates

---

## 🟡 HIGH PRIORITY SPRINT (1–2 Weeks)

### 4. Consolidate Validation Patterns with Zod
**Priority**: HIGH | **Impact**: HIGH | **Effort**: MEDIUM

**Goal**: Replace scattered validation utilities with centralized Zod schemas to ensure consistent input validation, better error messages, and type safety across API routes.

**Files to Touch**:
- `lib/validation/index.ts` (create if missing or expand)
- `lib/comments/validators.ts` (deprecated)
- `lib/bookmarks/validators.ts` (deprecated if exists)
- `app/api/comments/route.ts`
- `app/api/bookmarks/route.ts` (all API routes using validation)
- Any other API route files with custom validation

**Change List**:
- Create centralized `lib/validation/index.ts` with Zod schemas:
  - `CommentsParamsSchema` (postId, limit, page, sortOption)
  - `BookmarkFilterSchema` (category, readState, search, sort)
  - `CommentCreateSchema` (content, postId, parentId)
  - Export TypeScript types from schemas using `.infer<typeof>`
- Replace all custom validation functions with `.parse()` calls to schemas
- Update API route handlers to catch Zod errors and return structured error responses
- Remove deprecated validator files

**Acceptance Criteria**:
- All input validation uses Zod schemas consistently
- API errors include structured `errors` field with per-field messages
- TypeScript types auto-infer from schemas (zero manual type duplication)
- Validation tests cover success and failure paths
- No custom validation logic remains in API routes

**Risk/Rollback**:
- **Risk**: Zod parse errors could break existing API clients if error response format changes (mitigate: add API versioning or compatibility layer)
- **Rollback**: Restore old validator files; revert API route changes

---

### 5. Implement Distributed Rate Limiting with Upstash Redis
**Priority**: HIGH | **Impact**: HIGH | **Effort**: MEDIUM

**Goal**: Replace in-memory rate limiter with distributed Upstash Redis to handle multi-instance deployments and prevent abuse at scale.

**Files to Touch**:
- `lib/api-utils.ts` (replace existing rateLimit logic)
- `app/api/comments/route.ts` (integrate new rate limiter)
- `app/api/bookmarks/route.ts`
- Any other rate-limited API routes

**Change List**:
- Remove in-memory rate limiter from `lib/api-utils.ts`
- Implement `Ratelimit` from `@upstash/ratelimit` with Redis backend
- Create sliding window limiters: comments (5/min per user), general API (100/min)
- Update all API routes to use new `ratelimit.limit()` with auth token
- Add rate limit headers to responses (X-RateLimit-Limit, X-RateLimit-Remaining)
- Log rate limit violations for monitoring

**Acceptance Criteria**:
- Rate limiting works across multiple deployed instances
- API returns 429 when limit exceeded
- Rate limit headers present in all responses
- Unauthenticated requests use IP as fallback identifier
- Tests verify limit enforcement

**Risk/Rollback**:
- **Risk**: Redis outage could fail-open (requests allowed) or fail-closed (all requests blocked)—mitigate: add fallback behavior
- **Rollback**: Restore in-memory rate limiter; remove Upstash integration

---

### 6. Decompose CommentList into Focused Subcomponents
**Priority**: HIGH | **Impact**: MEDIUM | **Effort**: MEDIUM

**Goal**: Break 500+ line `CommentList.tsx` into smaller, testable, single-responsibility components to improve maintainability and enable independent optimization.

**Files to Touch**:
- `components/CommentList.tsx` (orchestrator/wrapper)
- `components/CommentList/CommentVirtualizer.tsx` (new)
- `components/CommentList/CommentForm.tsx` (new)
- `components/CommentList/CommentFilters.tsx` (new)
- `components/CommentList/hooks/useCommentPagination.ts` (new)
- `components/CommentList/hooks/useCommentRealtime.ts` (new)
- Any component importing `CommentList` (no API changes expected)

**Change List**:
- Extract virtualization logic into `CommentVirtualizer` (Virtuoso setup, itemContent, computeItemKey)
- Extract comment form logic into `CommentForm` (new comment, optimistic updates, rate limiting)
- Extract sorting/filtering UI into `CommentFilters` (sort dropdown, filter options)
- Extract pagination state into `useCommentPagination` hook
- Extract real-time subscription into `useCommentRealtime` hook
- Keep `CommentList.tsx` as orchestrator connecting subcomponents
- Update existing tests; add new tests for each subcomponent

**Acceptance Criteria**:
- `CommentList.tsx` reduced to <150 lines (orchestration only)
- Each subcomponent <200 lines with single responsibility
- All existing functionality preserved (comments load, sort, filter, real-time updates work)
- Tests provide >80% coverage for new subcomponents
- No performance regression in render time or scrolling
- Props interface clear and minimal

**Risk/Rollback**:
- **Risk**: Incorrect pagination or real-time subscription migration could break comments (mitigate: manual testing before merge)
- **Rollback**: Revert all component changes; restore original CommentList

---

### 7. Add WordPress GraphQL Retry Logic with Exponential Backoff
**Priority**: HIGH | **Impact**: MEDIUM | **Effort**: MEDIUM

**Goal**: Make WordPress content fetching resilient to transient errors by implementing exponential backoff retries for failed GraphQL requests.

**Files to Touch**:
- `lib/wordpress/client.ts` (fetchWordPressGraphQL function)
- `lib/wordpress/retry.ts` (new utility)

**Change List**:
- Create `lib/wordpress/retry.ts` with `fetchWithRetry` function (maxAttempts: 3, backoff: exponential)
- Update `fetchWordPressGraphQL` to use retry wrapper
- Implement error classification: 429/503/502 retry, 401/403/404 no retry, 500 retry
- Add jitter to backoff to prevent thundering herd
- Log retry attempts for observability

**Acceptance Criteria**:
- Transient errors (502, 503) trigger automatic retry
- Non-retryable errors (401, 404) fail immediately
- Retry respects exponential backoff (1s, 2s, 4s)
- Max 3 attempts total
- Tests verify retry logic with mocked fetch

**Risk/Rollback**:
- **Risk**: Excessive retries could slow down page rendering for permanent failures (mitigate: set short timeout)
- **Rollback**: Remove retry logic; revert to single-attempt fetch

---

### 8. Document Supabase RLS Policies
**Priority**: HIGH | **Impact**: MEDIUM | **Effort**: LOW

**Goal**: Add clear documentation of required Row-Level Security policies to prevent unauthorized data access and guide team on policy implementation.

**Files to Touch**:
- `lib/dal/bookmarks.ts` (add JSDoc)
- `lib/dal/comments.ts` (add JSDoc)
- `lib/dal/profiles.ts` (add JSDoc)
- `lib/dal/user-preferences.ts` (add JSDoc)
- `docs/database-rls-policies.md` (new, comprehensive reference)

**Change List**:
- Add JSDoc comments to each DAL file with RLS policy requirements
- Include SQL statements for each policy
- Create comprehensive `docs/database-rls-policies.md` with:
  - Overview of RLS strategy
  - Policies per table (bookmarks, comments, profiles, preferences)
  - SQL setup scripts
  - Testing guidelines
- Link to docs from README

**Acceptance Criteria**:
- Every DAL file clearly documents its RLS requirements
- Comprehensive RLS guide exists and is discoverable
- SQL policies are copy-paste ready
- Team can set up RLS without reverse-engineering code

**Risk/Rollback**:
- **Risk**: Documentation errors could guide misconfiguration (mitigate: peer review before merge)
- **Rollback**: Remove documentation; policies remain unchanged

---

## 🟢 MEDIUM PRIORITY SPRINT (2–4 Weeks)

### 9. Export Type Definitions from Query Functions
**Priority**: MEDIUM | **Impact**: MEDIUM | **Effort**: LOW

**Goal**: Enable type-safe API consumption by exporting return type definitions from all query functions, eliminating manual type declarations.

**Files to Touch**:
- `lib/comments/queries.ts`
- `lib/bookmarks/queries.ts`
- `lib/supabase/rest/queries.ts`
- All files consuming these queries (no code changes, just type improvements)

**Change List**:
- Add explicit return type annotations to all query functions
- Export type definitions alongside functions (e.g., `type ListCommentsResult = ...`)
- Update JSDoc to reference exported types
- Update consuming files to import and use exported types

**Acceptance Criteria**:
- All query functions have explicit `: Promise<ReturnType>` signatures
- Exported type interfaces for each query
- Type consumers can do `import type { ListCommentsResult } from "@/lib/comments/queries"`
- No `any` types in query definitions
- TypeScript strict mode catches consumer errors

**Risk/Rollback**:
- **Risk**: Incorrect type exports could mislead consumers (mitigate: manual verification)
- **Rollback**: Remove type exports; revert to inferred types

---

### 10. Decompose BookmarksContent into Subcomponents
**Priority**: MEDIUM | **Impact**: MEDIUM | **Effort**: MEDIUM

**Goal**: Refactor 400+ line `BookmarksContent.tsx` into focused subcomponents to reduce cognitive load and enable independent testing.

**Files to Touch**:
- `components/BookmarksContent.tsx` (orchestrator/wrapper)
- `components/BookmarksContent/BookmarkFilters.tsx` (new)
- `components/BookmarksContent/BookmarkList.tsx` (new)
- `components/BookmarksContent/BookmarkBulkActions.tsx` (new)
- `components/BookmarksContent/useBookmarkFiltering.ts` (new hook)

**Change List**:
- Extract filter UI (search, category, read state, sort) into `BookmarkFilters`
- Extract bookmark list rendering into `BookmarkList`
- Extract bulk actions (export, delete, mark as read) into `BookmarkBulkActions`
- Extract filtering logic into `useBookmarkFiltering` hook
- Simplify `BookmarksContent` to orchestrate subcomponents
- Update tests for each subcomponent

**Acceptance Criteria**:
- `BookmarksContent.tsx` reduced to <150 lines
- Each subcomponent <200 lines
- All filtering, sorting, bulk action functionality preserved
- >80% test coverage for new subcomponents
- No performance regression

**Risk/Rollback**:
- **Risk**: Complex filter state could break if migrated incorrectly (mitigate: snapshot testing)
- **Rollback**: Revert all component decomposition

---

### 11. Add Comprehensive Test Coverage for API Error Paths
**Priority**: MEDIUM | **Impact**: MEDIUM | **Effort**: MEDIUM

**Goal**: Improve test coverage by adding integration tests for error scenarios (DB failures, network errors, validation failures) in critical API routes.

**Files to Touch**:
- `__tests__/integration/api/comments.test.ts` (new)
- `__tests__/integration/api/bookmarks.test.ts` (new)
- `__tests__/integration/supabase/errors.test.ts` (new)

**Change List**:
- Create integration test suite for comments API:
  - Success path (create, list, delete)
  - Database error handling (connection failures)
  - Validation error responses
  - Rate limit enforcement
  - Real-time subscription errors
- Create similar test suite for bookmarks API
- Test Supabase error handling (RLS violations, not found)
- Mock Supabase failures; verify error responses
- Achieve >80% coverage on error paths

**Acceptance Criteria**:
- All API error paths have tests
- Error responses include structured `errors` field
- Database connection failures don't crash server
- Rate limit errors return 429
- Validation failures return 422 with field-level errors
- Tests run in CI/CD pipeline

**Risk/Rollback**:
- **Risk**: Mocks could not reflect real Supabase behavior (mitigate: review with Supabase docs)
- **Rollback**: Delete test files; remove tests from CI

---

### 12. Create API Response Type System
**Priority**: MEDIUM | **Impact**: MEDIUM | **Effort**: LOW

**Goal**: Establish consistent API response types across all endpoints to improve frontend type safety and reduce manual response parsing.

**Files to Touch**:
- `lib/api-types.ts` (new)
- `lib/api-utils.ts` (update error handling to use new types)
- All API route files (standardize response format)

**Change List**:
- Define `ApiResponse<T>` union type:
  - `{ success: true; data: T; meta?: Record<string, any> }`
  - `{ success: false; error: string; errors?: Record<string, string[]>; statusCode: number }`
- Update all API routes to return standardized responses
- Export types for frontend consumption (`NEXT_PUBLIC_API_TYPES`)
- Update error handler in `lib/api-utils.ts` to conform to new types

**Acceptance Criteria**:
- All API endpoints return consistent response format
- Success responses include `data` field
- Error responses include `statusCode` and optionally `errors`
- Frontend can safely destructure `{ success, data, error }` from all endpoints
- TypeScript catches missing checks
- Zero breaking changes to existing API consumers

**Risk/Rollback**:
- **Risk**: Response format change could break existing clients (mitigate: add API versioning header)
- **Rollback**: Revert to previous response formats

---

### 13. Enhance Virtuoso Configuration for Better Scrolling
**Priority**: MEDIUM | **Impact**: LOW | **Effort**: LOW

**Goal**: Optimize infinite scroll performance by tuning Virtuoso overscan and viewport settings for smoother perceived performance.

**Files to Touch**:
- `components/CommentList.tsx` (Virtuoso props)

**Change List**:
- Add `overscan={5}` to pre-render items outside viewport
- Add `increaseViewportBy={{ top: 100, bottom: 100 }}` to buffer items
- Monitor performance; adjust values if needed
- Test scroll smoothness on low-end devices

**Acceptance Criteria**:
- Scroll performance smooth on mobile devices
- No jank when scrolling fast
- Items load before entering viewport
- CPU usage reasonable

**Risk/Rollback**:
- **Risk**: Overscan values too high could increase memory usage (mitigate: monitor on low-end devices)
- **Rollback**: Revert to default Virtuoso settings

---

### 14. Move Complex Filtering Logic to Utilities
**Priority**: MEDIUM | **Impact**: LOW | **Effort**: LOW

**Goal**: Extract complex useMemo filtering in `BookmarksContent` into reusable, testable utilities to improve code readability and testability.

**Files to Touch**:
- `lib/bookmarks/filters.ts` (new)
- `components/BookmarksContent.tsx` (simplify useMemo)

**Change List**:
- Create `lib/bookmarks/filters.ts` with functions:
  - `filterByReadState(readState)`
  - `filterByCategory(category)`
  - `filterBySearch(search)`
  - `sortBookmarks(sort)`
  - `filterBookmarks(bookmarks, filters)` (composite)
- Replace complex useMemo in component with single `filterBookmarks` call
- Add unit tests for each filter function
- Update component to compose filters

**Acceptance Criteria**:
- Filter logic extracted to `lib/bookmarks/filters.ts`
- Component useMemo reduced to single line
- >90% test coverage for filter utilities
- Behavior unchanged
- Easy to reuse filter logic elsewhere

**Risk/Rollback**:
- **Risk**: Filter migration could introduce bugs (mitigate: snapshot test before/after)
- **Rollback**: Restore original useMemo logic

---

### 15. Add Observability: Structured Logging for Critical Paths
**Priority**: MEDIUM | **Impact**: LOW | **Effort**: MEDIUM

**Goal**: Implement structured logging for critical flows (auth bootstrap, WordPress GraphQL failures, comment operations) to aid production debugging.

**Files to Touch**:
- `lib/logger.ts` (new or expand)
- `app/providers.tsx` (bootstrap logging)
- `lib/wordpress/client.ts` (GraphQL error logging)
- `lib/supabase/rest/client.ts` (Supabase error logging)

**Change List**:
- Create `lib/logger.ts` with structured logging (JSON format for parsing)
- Log bootstrap steps (auth fetch, preference fetch, completion)
- Log GraphQL errors with request/response context
- Log Supabase errors with table/operation/user info
- Include request IDs for tracing

**Acceptance Criteria**:
- Critical paths produce structured logs
- Production logs parse to JSON
- Request IDs enable tracing
- No sensitive data (passwords, tokens) in logs
- Logs include severity levels (info, warn, error)

**Risk/Rollback**:
- **Risk**: Verbose logging could impact performance (mitigate: sample non-critical logs in prod)
- **Rollback**: Remove logging calls; restore original code

---

## Summary Table

| Backlog Item | Sprint | Priority | Impact | Effort | Status |
|---|---|---|---|---|---|
| 1. Merge duplicate contexts | 1-2d | CRITICAL | HIGH | LOW | Ready |
| 2. Pin all `latest` dependencies | 1-2d | CRITICAL | HIGH | LOW | Ready |
| 3. Fix ref memory leak | 1-2d | CRITICAL | HIGH | LOW | Ready |
| 4. Consolidate validation w/ Zod | 1-2w | HIGH | HIGH | MEDIUM | Backlog |
| 5. Distributed rate limiting | 1-2w | HIGH | HIGH | MEDIUM | Backlog |
| 6. Decompose CommentList | 1-2w | HIGH | MEDIUM | MEDIUM | Backlog |
| 7. Add GraphQL retry logic | 1-2w | HIGH | MEDIUM | MEDIUM | Backlog |
| 8. Document RLS policies | 1-2w | HIGH | MEDIUM | LOW | Backlog |
| 9. Export query type defs | 2-4w | MEDIUM | MEDIUM | LOW | Backlog |
| 10. Decompose BookmarksContent | 2-4w | MEDIUM | MEDIUM | MEDIUM | Backlog |
| 11. Test API error paths | 2-4w | MEDIUM | MEDIUM | MEDIUM | Backlog |
| 12. API response type system | 2-4w | MEDIUM | MEDIUM | LOW | Backlog |
| 13. Enhance Virtuoso config | 2-4w | MEDIUM | LOW | LOW | Backlog |
| 14. Extract filter utilities | 2-4w | MEDIUM | LOW | LOW | Backlog |
| 15. Structured logging | 2-4w | MEDIUM | LOW | MEDIUM | Backlog |

---

## Execution Guidelines

1. **Critical Sprint** (Start immediately—blockers for stability)
   - Run sequentially; verify each item before proceeding
   - Test thoroughly; prioritize rollback procedures
   - Estimated 2–4 hours elapsed time with testing

2. **High Priority Sprint** (Start after Critical items deployed)
   - Can run in parallel (items 4–8 are mostly independent)
   - Coordinate Zod + validation (items 4 & 12)
   - Estimated 1–2 weeks with team of 2 engineers

3. **Medium Priority Sprint** (Ongoing maintenance)
   - Lower urgency; execute when capacity allows
   - Good for onboarding or junior engineers
   - Can span multiple sprints

---

## Dependencies & Ordering

**Hard Dependencies**:
- Item 2 (pin dependencies) should complete before items 1–3 deploy (ensures reproducible builds)
- Item 12 (API response types) blocks items 4–5 refinement (optional coordination)
- Item 4 (Zod validation) enables item 11 (error path tests)

**Soft Dependencies**:
- Items 6 & 10 (component decomposition) independent but use similar patterns
- Item 8 (RLS docs) doesn't block other work but improves context for items 9–11

---

## Notes for Tech Lead

- **Risk Profile**: Critical sprint has HIGH risk due to foundational changes (contexts, dependencies). Ensure comprehensive testing and short rollback windows.
- **Team Allocation**: Consider pair programming for items 1, 6, 10 to catch decomposition mistakes early.
- **Metrics to Track**: Build reproducibility (item 2), error rate (item 7), page load time (item 13), test coverage (item 11).
- **Future Roadmap**: After this backlog, consider E2E tests (Playwright), performance benchmarks (Lighthouse CI), and API versioning strategy.
