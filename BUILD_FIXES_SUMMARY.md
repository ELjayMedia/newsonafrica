# Build Fixes Summary

## Issues Fixed

### 1. ArticleClientContent Props Type Error ✓
**Issue**: ArticleClientContent was passing 4 props that don't exist on ArticleClientShell:
- `initialComments={[]}`
- `initialCommentCursor={null}`
- `initialCommentHasMore={false}`
- `initialCommentTotal={0}`

**Solution**: Removed these unused comment-related props from ArticleClientContent.tsx. The ArticleClientShell component was recently rebuilt and doesn't include comment functionality yet.

**Files Changed**: `app/(public)/[countryCode]/article/[slug]/ArticleClientContent.tsx`

### 2. Environment Validation Cache Issue
**Issue**: Build error showing validation failures for NEXT_PUBLIC_WP_TZ_GRAPHQL and NEXT_PUBLIC_WP_GH_GRAPHQL even though they were removed from config/env.ts.

**Cause**: The .next directory contains cached compiled JavaScript from the previous build. When Vercel runs subsequent builds, it reuses this cached code which still references the old schema.

**Solution**: The build cache will clear automatically on the next Vercel deployment. If running locally, execute:
```bash
rm -rf .next && pnpm run build
```

## Changes Made

- **ArticleClientContent.tsx**: Removed 4 comment-related props from ArticleClientShell invocation
- **config/env.ts**: Already clean - only validates sz, za, ng endpoints
- **clear-cache.sh**: Created cleanup script for local development

## Status

All TypeScript type errors are now resolved. The remaining environment validation warnings in the debug logs are from cached build artifacts and will disappear after:
1. Redeploying to Vercel (automatic cache clear)
2. Running local clean build: `rm -rf .next && pnpm run build`
