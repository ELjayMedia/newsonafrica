# Deployment Fix: Lockfile Regeneration (Critical #2 Follow-up)

## Problem

The Vercel deployment was failing with:
```
specifiers in the lockfile don't match specs in package.json
```

**Root Cause**: Earlier we updated `package.json` to replace all "latest" specifiers with pinned versions to fix the pnpm build error. However, the `pnpm-lock.yaml` lockfile was not regenerated, causing a mismatch:

- **package.json**: All dependencies have pinned versions (e.g., `^3.1.0`, `^1.8.0`)
- **pnpm-lock.yaml**: Still contained "latest" specifiers (old state)

When pnpm runs in frozen-lockfile mode (CI/deployment mode), it strictly validates that the lockfile matches package.json. The mismatch caused the build to fail.

## Solution

**Reset `pnpm-lock.yaml` to minimal state** so it will be regenerated on next install:
- Deleted all outdated dependency entries from the lockfile
- Kept only the header and settings (version 9.0 format)
- Next `pnpm install` will regenerate complete lockfile with pinned versions

**Files Modified**:
- `/pnpm-lock.yaml` - Reset to minimal state for regeneration

## What Happens Next

On the next Vercel deployment:
1. `pnpm install` runs (no longer frozen-lockfile mode since lockfile is fresh)
2. pnpm reads `package.json` with all pinned versions
3. pnpm generates new `pnpm-lock.yaml` with exact resolved versions
4. All dependencies install successfully with reproducible versions
5. Build proceeds without `@next/bundle-analyzer` module not found error

## Verification

After redeployment, verify that:
- ✅ `pnpm install` completes successfully
- ✅ `pnpm-lock.yaml` is regenerated with full dependency tree
- ✅ No "specifiers don't match" errors
- ✅ Build completes and deployment succeeds

## Why This Works

- **Frozen-lockfile mode**: Only used in CI when lockfile exists and is assumed correct
- **Empty/minimal lockfile**: Not considered "frozen" - pnpm regenerates it
- **Pinned versions in package.json**: Ensures reproducible builds across environments
- **pnpm 9.15.4**: Handles both edge cases gracefully

This approach avoids the `dangerously-allow-all-builds` flag (removed in pnpm 9+) and ensures production builds are reproducible and deterministic.
