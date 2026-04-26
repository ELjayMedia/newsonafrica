# Deployment & Integration Checklist

Use this checklist to verify everything is ready before deploying to production.

---

## ✅ Pre-Deployment Checklist

### Environment Setup
- [ ] All required environment variables set in Vercel
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] NEXT_PUBLIC_WP_SZ_GRAPHQL
  - [ ] NEXT_PUBLIC_WP_ZA_GRAPHQL
  - [ ] NEXT_PUBLIC_WP_NG_GRAPHQL
  - [ ] NEXT_PUBLIC_DEFAULT_SITE
  - [ ] NEXT_PUBLIC_SITE_URL
  - [ ] SESSION_COOKIE_SECRET
- [ ] Production credentials verified (not development credentials)
- [ ] Sensitive variables marked as "Sensitive" in Vercel UI

### Code Quality
- [ ] `pnpm typecheck` passes (no TypeScript errors)
- [ ] `pnpm lint` passes (no ESLint errors)
- [ ] `pnpm test` passes (all unit tests passing)
- [ ] `pnpm test:e2e` passes (critical E2E tests passing)
- [ ] No console errors in local dev server
- [ ] No console warnings in production build

### Build Verification
- [ ] `pnpm build` completes successfully
- [ ] No build warnings related to dependencies
- [ ] No missing image optimizations
- [ ] No unused imports or variables
- [ ] Bundle size reasonable (~150KB gzipped)

### Configuration Files
- [ ] `next.config.js` verified (security headers enabled)
- [ ] `vercel.json` verified (cron jobs configured)
- [ ] `tsconfig.json` verified (strict mode enabled)
- [ ] `tailwind.config.ts` verified (all colors defined)
- [ ] `middleware.ts` verified (session refresh working)
- [ ] Environment variable validation function works

### Database & Services
- [ ] Supabase project configured
- [ ] Supabase database tables created
- [ ] Supabase RLS policies configured
- [ ] Supabase Auth enabled
- [ ] WordPress GraphQL endpoints tested
- [ ] Connection strings verified

### Security Review
- [ ] CSP headers configured in `next.config.js`
- [ ] HSTS enabled in headers
- [ ] X-Frame-Options set to DENY
- [ ] Secure cookies configured (httpOnly)
- [ ] CORS headers properly set for API routes
- [ ] Session cookie secret is long and random (32+ chars)
- [ ] No credentials hardcoded in code
- [ ] No sensitive data in environment variables for preview

### Testing Complete
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Critical E2E tests pass
- [ ] Search API rate limiting tested
- [ ] Authentication flow tested
- [ ] Dark mode switching tested
- [ ] Responsive design tested (mobile/tablet/desktop)

### Design & UX
- [ ] Design tokens in `app/globals.css` reviewed
- [ ] Dark mode theme verified
- [ ] Typography styles verified
- [ ] Color contrast meets WCAG standards
- [ ] No placeholder images or Lorem Ipsum
- [ ] All images optimized (AVIF/WebP formats)
- [ ] v0 design mode compatible

### Performance Check
- [ ] Image optimization enabled
- [ ] Code splitting verified
- [ ] Font preloading working
- [ ] CSS minified in production
- [ ] JavaScript minified in production
- [ ] No unnecessary dependencies
- [ ] Bundle analysis reviewed (ANALYZE=true)

### Documentation
- [ ] README.md up to date
- [ ] Environment variable documentation complete
- [ ] Deployment procedures documented
- [ ] Troubleshooting guide reviewed
- [ ] Dependencies documented

---

## ✅ Vercel Configuration Checklist

### Project Settings
- [ ] Project name set correctly
- [ ] GitHub repository connected (ELjayMedia/newsonafrica)
- [ ] Production branch set to `main`
- [ ] Preview deployments enabled
- [ ] Automatic Git deployments enabled

### Build Configuration
- [ ] Build command: `pnpm build`
- [ ] Install command: `pnpm install --frozen-lockfile`
- [ ] Output directory: `.next`
- [ ] Node.js version: 22.x
- [ ] Package manager: pnpm

### Environment Variables
- [ ] All variables added to Vercel project
- [ ] Separate preview/production values where applicable
- [ ] Sensitive variables marked as sensitive
- [ ] No hardcoded credentials in code

### Domains & HTTPS
- [ ] Primary domain configured (newsonafrica.com)
- [ ] HTTPS enforced
- [ ] DNS records verified
- [ ] SSL certificate installed
- [ ] Redirect www to non-www (or vice versa)

### Analytics & Monitoring
- [ ] Web Vitals monitoring enabled
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry recommended)
- [ ] Performance monitoring enabled

---

## ✅ Redis/KV Refactoring Verification

### Dependencies
- [ ] `@vercel/kv` removed from package.json
- [ ] pnpm-lock.yaml updated (run `pnpm install`)
- [ ] No `@vercel/kv` imports in codebase
- [ ] No KV_REST_API references in codebase
- [ ] No UPSTASH_KV_ environment variables

### Functionality
- [ ] Search API still works (`/api/search`)
- [ ] Rate limiting functional (in-process)
- [ ] No runtime errors related to KV
- [ ] Search tests passing

### Environment Variables Removed
- [ ] ❌ UPSTASH_KV_KV_URL (removed)
- [ ] ❌ UPSTASH_KV_KV_REST_API_TOKEN (removed)
- [ ] ❌ UPSTASH_KV_KV_REST_API_READ_ONLY_TOKEN (removed)
- [ ] ❌ UPSTASH_KV_REDIS_URL (removed)
- [ ] ❌ UPSTASH_KV_KV_REST_API_URL (removed)

---

## ✅ v0 Design Mode Verification

### Design System
- [ ] Design tokens in `app/globals.css` present
- [ ] Light theme CSS variables defined
- [ ] Dark theme CSS variables defined
- [ ] Color tokens: primary, secondary, accent, etc.
- [ ] Typography classes: display-*, heading-*, body-*, ui-*
- [ ] Border radius defined
- [ ] Component utilities defined

### Design Mode Compatibility
- [ ] v0 can access globals.css
- [ ] CSS variables are editable
- [ ] Color picker works in design mode
- [ ] Dark mode toggle works in preview
- [ ] HMR shows changes immediately
- [ ] Design changes can be committed

### Color System
- [ ] Primary color defined and used (green #36a64f)
- [ ] Secondary colors defined
- [ ] Destructive (error) colors defined
- [ ] Neutral grays defined
- [ ] All colors use CSS variables (not hard-coded)

---

## ✅ Testing Verification

### Unit & Integration Tests
- [ ] Test files exist for critical functions
- [ ] `pnpm test` runs successfully
- [ ] Coverage reports generated
- [ ] No flaky tests

### E2E Tests
- [ ] Playwright configured and working
- [ ] Critical user flows tested
- [ ] `pnpm test:e2e` passes
- [ ] Tests don't rely on external services

### Local Development
- [ ] `pnpm dev` starts without errors
- [ ] HMR works for code changes
- [ ] HMR works for style changes
- [ ] No console errors during development

---

## ✅ Documentation Verification

### Created Documents
- [ ] VERCEL_V0_INTEGRATION_SUMMARY.md exists
- [ ] VERCEL_V0_AUDIT_REPORT.md exists
- [ ] SETUP_AND_DEPLOYMENT_GUIDE.md exists
- [ ] MISSING_DEPENDENCIES_AND_RECOMMENDATIONS.md exists
- [ ] DOCUMENTATION_INDEX.md exists
- [ ] DEPLOYMENT_CHECKLIST.md exists (this file)

### Documentation Quality
- [ ] All documents are readable and well-organized
- [ ] Code examples are accurate
- [ ] Configuration file examples work
- [ ] Troubleshooting section covers common issues

---

## ✅ Final Review

### Code Review
- [ ] All PRs approved before merge
- [ ] Code follows project style guide
- [ ] No TODO or FIXME comments left unresolved
- [ ] Proper error handling implemented

### Security Review
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] Proper input validation
- [ ] Secure session handling
- [ ] No secrets exposed in code or logs

### Performance Review
- [ ] Lighthouse score acceptable (90+)
- [ ] Core Web Vitals metrics good
- [ ] Bundle size within limits
- [ ] Database queries optimized
- [ ] Images compressed and optimized

### Accessibility Review
- [ ] WCAG 2.1 Level AA compliant
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] alt text on all images

---

## ✅ Deployment Execution

### Pre-Deployment
- [ ] All checklist items above completed
- [ ] Staging environment tested
- [ ] Backup of current production taken
- [ ] Rollback plan documented

### Deployment
- [ ] Push feature branch with all changes
- [ ] Create PR for review
- [ ] Verify preview deployment works
- [ ] Review preview deployment
- [ ] Merge PR to main branch
- [ ] Monitor production deployment

### Post-Deployment
- [ ] Verify site loads without errors
- [ ] Test critical user flows
- [ ] Check console for errors
- [ ] Monitor error tracking (Sentry/etc)
- [ ] Monitor performance metrics
- [ ] Check analytics are being collected

### Monitoring First 24 Hours
- [ ] No error spikes
- [ ] Performance metrics normal
- [ ] Database queries normal
- [ ] API response times normal
- [ ] Search functionality working
- [ ] Authentication flows working

---

## ✅ Post-Deployment

### Monitoring Setup
- [ ] Error tracking configured (Sentry recommended)
- [ ] Analytics tracking verified
- [ ] Web Vitals being collected
- [ ] Performance alerts configured
- [ ] Error alerts configured

### Maintenance Schedule
- [ ] Dependencies updated regularly
- [ ] Security patches applied
- [ ] Database backups configured
- [ ] Monitoring alerts reviewed weekly
- [ ] Performance reviewed monthly

### Documentation Updates
- [ ] Deployment documentation updated
- [ ] Known issues documented
- [ ] Troubleshooting guide updated
- [ ] Change log updated

---

## 📊 Checklist Status

**Total Items:** 150+  
**Recommended Status Before Deploy:** All items checked ✅

### Categories
- Environment Setup: 10 items
- Code Quality: 8 items
- Build Verification: 4 items
- Configuration: 5 items
- Database & Services: 6 items
- Security: 7 items
- Testing: 5 items
- Design & UX: 6 items
- Performance: 8 items
- Documentation: 4 items
- Vercel Configuration: 11 items
- Redis/KV Refactoring: 5 items
- v0 Design Mode: 12 items
- Testing Verification: 4 items
- Documentation Verification: 6 items
- Final Review: 12 items
- Deployment Execution: 8 items
- Post-Deployment: 8 items
- Post-Deployment Monitoring: 5 items
- Maintenance: 5 items

---

## 🚀 Deployment Signal

When **ALL** checkboxes above are checked ✅:

✅ **Project is ready for production deployment**

Green light to:
- [ ] Merge PR to main
- [ ] Deploy to production
- [ ] Monitor closely for first 24 hours
- [ ] Gather feedback from users

---

## 📞 Deployment Support

If any item cannot be checked:
1. Refer to relevant documentation file
2. Check troubleshooting section
3. Review configuration files
4. Contact development team

**Documentation Quick Links:**
- General overview: `VERCEL_V0_INTEGRATION_SUMMARY.md`
- Setup procedures: `SETUP_AND_DEPLOYMENT_GUIDE.md`
- Troubleshooting: `SETUP_AND_DEPLOYMENT_GUIDE.md#Troubleshooting`
- Dependencies: `MISSING_DEPENDENCIES_AND_RECOMMENDATIONS.md`
- Technical details: `VERCEL_V0_AUDIT_REPORT.md`

---

**Last Updated:** April 26, 2026  
**Version:** 1.0  
**Status:** Ready for use
