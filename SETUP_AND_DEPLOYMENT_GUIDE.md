# Setup and Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Environment Configuration](#environment-configuration)
3. [Preview Environment](#preview-environment)
4. [Testing](#testing)
5. [Deployment to Vercel](#deployment-to-vercel)
6. [Monitoring and Debugging](#monitoring-and-debugging)
7. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites
- Node.js 22.x (required by package.json engines)
- pnpm 9.15.4 or later
- Git for version control

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ELjayMedia/newsonafrica.git
   cd newsonafrica
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```
   This will:
   - Install all npm packages
   - Update `pnpm-lock.yaml` with dependency tree
   - Set up node_modules with pnpm's hoisted structure

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your credentials (see [Environment Configuration](#environment-configuration))

4. **Start development server:**
   ```bash
   pnpm dev
   ```
   Server runs on `http://localhost:3000` with HMR enabled

5. **Verify installation:**
   ```bash
   pnpm typecheck   # Check TypeScript compilation
   pnpm lint        # Run ESLint
   ```

### Development Commands

```bash
# Development
pnpm dev                  # Start Next.js dev server (HMR enabled)

# Building
pnpm build                # Production build
pnpm start                # Start production server locally

# Code Quality
pnpm typecheck            # TypeScript type checking
pnpm lint                 # ESLint validation
pnpm check:dal-aliases    # Verify DAL import aliases

# Testing
pnpm test                 # Run unit/integration tests (Vitest)
pnpm test:coverage        # Generate coverage report
pnpm test:e2e             # Run E2E tests (Playwright)

# Analysis
pnpm analyze              # Bundle analysis (sets ANALYZE=true)
pnpm backfill-search      # Update search index from WordPress
```

---

## Environment Configuration

### Required Environment Variables

#### Public Variables (Safe in Browser)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key

# WordPress GraphQL Endpoints (Multi-site)
NEXT_PUBLIC_WP_SZ_GRAPHQL=https://sz.example.com/graphql
NEXT_PUBLIC_WP_ZA_GRAPHQL=https://za.example.com/graphql
NEXT_PUBLIC_WP_NG_GRAPHQL=https://ng.example.com/graphql

# Site Configuration
NEXT_PUBLIC_DEFAULT_SITE=sz          # Default country code
NEXT_PUBLIC_SITE_URL=https://newsonafrica.com
```

#### Private Variables (Server-Only)
```env
# Supabase Service Role (NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session Security
SESSION_COOKIE_SECRET=<generate-with: openssl rand -base64 32>
```

### Environment Variable Setup Steps

1. **Local Development:**
   ```bash
   cp .env.example .env.local
   # Edit with your Supabase and WordPress credentials
   ```

2. **Vercel Preview/Production:**
   - Go to Vercel Project Settings → Environment Variables
   - Add each variable for the appropriate environment:
     - `Preview` - Staging/branch deployments
     - `Production` - Main branch deployment
   - Sensitive variables should be marked as sensitive

3. **Generating SESSION_COOKIE_SECRET:**
   ```bash
   openssl rand -base64 32
   # Copy output to SESSION_COOKIE_SECRET
   ```

### Environment Variable Validation
The app validates required vars at startup:

```typescript
// lib/env.ts
validateRequiredEnv()  // Called in app/layout.tsx

// Throws error if missing:
// - NEXT_PUBLIC_SUPABASE_URL
// - NEXT_PUBLIC_SUPABASE_ANON_KEY
// - SUPABASE_SERVICE_ROLE_KEY
```

---

## Preview Environment

### What is the Preview Environment?
The Vercel preview environment is a temporary deployment created for every pull request, allowing you to:
- Test changes before merging to main
- Share interactive prototypes with team
- Verify design changes and user flows
- Test API integrations in near-production conditions

### Enabling Preview Deployments

1. **Connect GitHub Repository:**
   - Go to vercel.com → Select Project
   - Go to Settings → Git
   - Connect your GitHub repository (ELjayMedia/newsonafrica)

2. **Configure Preview Settings:**
   - Settings → Deployment
   - Enable "Automatic Git Deployments"
   - Set production branch to `main`

3. **Create Pull Request:**
   ```bash
   git checkout -b feature/my-feature
   git commit -am "My changes"
   git push origin feature/my-feature
   # Create PR on GitHub
   ```

4. **Vercel Automatically:**
   - Detects PR
   - Builds preview deployment
   - Comments PR with preview URL
   - Re-deploys on new commits

### Preview Deployment Features

| Feature | Status | Details |
|---------|--------|---------|
| Hot Module Replacement | ✅ | Live updates as you edit |
| Environment Variables | ✅ | Uses preview env vars |
| Database Access | ✅ | Connects to Supabase |
| API Routes | ✅ | All endpoints functional |
| Authentication | ✅ | Supabase SSR works |
| Design Editing | ✅ | v0 design mode ready |
| Search Functionality | ✅ | Rate limiting active |
| Analytics | ✅ | Web Vitals tracked |

### Preview URL Structure
```
https://newsonafrica-{branch-name}-{repo-owner}.vercel.app
```

---

## Testing

### Unit and Integration Tests

```bash
# Run all tests once
pnpm test

# Watch mode for development
pnpm test -- --watch

# Generate coverage report
pnpm test:coverage
# Reports available in coverage/index.html
```

**Test Files Location:**
- Co-located with components: `ComponentName.test.tsx`
- In `__tests__` directories for utility tests
- Middleware tests: `middleware.test.ts`

### End-to-End Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e -- search.spec.ts

# Run in debug mode with UI
pnpm test:e2e -- --debug
```

**E2E Test File Location:** `e2e/` directory

### Test Configuration
- **Framework:** Vitest v1.6.1
- **Environment:** jsdom (browser simulation)
- **E2E Tool:** Playwright v1.57.0
- **Coverage Provider:** v8

### Testing Best Practices
1. Test user flows, not implementation details
2. Use semantic queries (getByRole, getByLabelText)
3. Test accessibility (a11y) alongside functionality
4. Keep E2E tests focused on critical paths
5. Mock external APIs (WordPress, Supabase) in unit tests

---

## Deployment to Vercel

### Automatic Deployment

**Main Branch (Production):**
```
commit to main → Vercel builds → Deploy to production
```

**Feature Branches (Preview):**
```
push to branch → Create PR → Vercel builds → Preview URL
```

### Manual Deployment Steps

1. **Prepare for Deployment:**
   ```bash
   # Ensure all tests pass
   pnpm test
   pnpm test:e2e
   
   # Type checking
   pnpm typecheck
   
   # Build locally to verify
   pnpm build
   ```

2. **Create Pull Request:**
   ```bash
   git checkout -b feature/my-feature
   git add .
   git commit -m "Add my feature"
   git push origin feature/my-feature
   ```
   Go to GitHub and create PR → Vercel creates preview

3. **Merge to Main (Production Deploy):**
   ```bash
   # After PR review and approval
   git checkout main
   git pull origin main
   git merge feature/my-feature
   git push origin main
   # Vercel automatically deploys to production
   ```

### Vercel Deployment Settings

**Build Configuration:**
```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

**Environment Variables:**
- Preview: Uses preview env vars
- Production: Uses production env vars
- Sensitive variables marked as non-exposable

### Post-Deployment Verification

```bash
# Check deployment status
vercel status

# View logs
vercel logs newsonafrica

# Test production URL
curl https://newsonafrica.com/api/search?q=test
```

---

## Monitoring and Debugging

### Web Vitals Monitoring

The app includes automatic Web Vitals collection:

```typescript
// app/reportWebVitals.ts
- Collects: LCP, FID, FCPID, LCP, CLS, TTFB
- Sends to: Vercel Analytics (built-in)
- Viewable in: Vercel Dashboard → Analytics
```

### Server-Side Logging

```typescript
// Enable debug logs
console.log("Debug info:", data)  // Appears in Vercel logs

// Production errors automatically logged
```

### Accessing Vercel Logs

```bash
# View recent logs
vercel logs newsonafrica

# Filter by environment
vercel logs newsonafrica --prod
vercel logs newsonafrica --git-branch feature-name

# Stream live logs
vercel logs newsonafrica --follow
```

### Performance Debugging

1. **Bundle Analysis:**
   ```bash
   ANALYZE=true pnpm build
   # Generated files show bundle size breakdown
   ```

2. **Next.js Trace:**
   ```bash
   node --trace-warnings next build
   ```

3. **Performance in Preview:**
   - Open DevTools → Performance tab
   - Record interaction and analyze
   - Check Network tab for waterfall

### Error Tracking

**Current Setup:**
- Console errors logged to Vercel
- Client-side errors visible in DevTools
- Server-side errors in Vercel dashboard

**Recommended Future Addition:**
```bash
# Install Sentry for comprehensive error tracking
pnpm add @sentry/nextjs
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Preview Not Updating
**Problem:** Changes don't appear in preview  
**Solution:**
```bash
# Hard refresh in browser
Cmd/Ctrl + Shift + R  # Clear cache and reload

# Or restart dev server
# Stop: Ctrl + C
# Start: pnpm dev
```

#### 2. Environment Variables Missing
**Problem:** "NEXT_PUBLIC_SUPABASE_URL is not set"  
**Solution:**
```bash
# Verify .env.local exists
cat .env.local

# Verify Vercel env vars are set
vercel env list
vercel env pull  # Download from Vercel
```

#### 3. Build Fails Locally
**Problem:** `pnpm build` fails with errors  
**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Clear pnpm cache
pnpm store prune

# Reinstall
pnpm install

# Try build again
pnpm build
```

#### 4. Tests Fail Unexpectedly
**Problem:** Tests pass locally, fail in CI/CD  
**Solution:**
```bash
# Run with exact CI environment
pnpm test --run  # Don't watch
pnpm test:coverage  # Include coverage

# Check environment-specific code
# Look for: process.env.NODE_ENV, window checks
```

#### 5. TypeScript Errors After Update
**Problem:** New TS errors after dependency update  
**Solution:**
```bash
# Run type check
pnpm typecheck

# Regenerate types if using GraphQL
pnpm run codegen

# Update tsconfig if needed
# Most updates auto-handled by Next.js
```

#### 6. Supabase Connection Fails
**Problem:** "Failed to connect to Supabase"  
**Solution:**
```bash
# Verify credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test Supabase connectivity
# Visit: https://your-project-ref.supabase.co/

# Check auth status
# Open DevTools Console → supabase logs
```

#### 7. Search Rate Limiting Issues
**Problem:** Search returns 429 (Too Many Requests)  
**Solution:**
- In-process rate limiting resets every 15 minutes
- Wait for reset window to pass
- Check RATE_LIMIT constant in `app/api/search/route.ts`
- This is per-instance, not distributed

---

## Advanced Configuration

### Customizing Tailwind Theme

Edit `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      primary: "hsl(var(--primary))",  // Use CSS variables
      // Add custom colors here
    }
  }
}
```

Then update `app/globals.css`:

```css
:root {
  --primary: 142.1 76.2% 36.3%;  /* Edit HSL values */
}
```

### Adding New Routes

1. **Create page:**
   ```
   app/new-page/page.tsx
   ```

2. **Next.js automatically routes:**
   ```
   /new-page
   ```

3. **Add to navigation** (if applicable)

### Adding API Endpoints

1. **Create route:**
   ```
   app/api/new-endpoint/route.ts
   ```

2. **Accessible at:**
   ```
   POST /api/new-endpoint
   ```

3. **Middleware applies:**
   - CORS headers for API routes
   - Session refresh for auth

---

## Summary

**Quick Start:**
```bash
pnpm install           # Install deps
cp .env.example .env.local  # Setup env
pnpm dev              # Start dev server
pnpm test             # Run tests
pnpm build            # Build for production
```

**Deployment Flow:**
```
Feature branch → PR → Preview URL → Merge → Production
```

All systems are ready for seamless development, testing, and deployment!
