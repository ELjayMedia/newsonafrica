# Troubleshooting Guide

## Common Issues and Solutions

### GraphQL Endpoint Misconfiguration

**Symptoms:**
- GraphQL requests returning 404 errors
- Logs showing unexpected hosts or missing country slugs in `/graphql` URLs

**Root Cause:**
Custom GraphQL environment variables (for example `NEXT_PUBLIC_WP_SZ_GRAPHQL`) are set to incorrect values that do not include the country slug or point to the wrong host.

**Solution:**

#### Option 1: Remove the Malformed Environment Variables (Recommended)
The application has built-in defaults that construct the correct URLs. Simply remove or unset these environment variables:

In Vercel:
1. Go to Project Settings → Environment Variables
2. Delete or unset any WordPress endpoint overrides, such as:
   - `NEXT_PUBLIC_WP_<COUNTRY>_GRAPHQL`
3. Redeploy your application

The app will automatically use the default GraphQL endpoint pattern: `https://newsonafrica.com/{country}/graphql`.

#### Option 2: Set Correct Values
If you need to override the defaults, ensure the URLs follow this pattern:

```bash
# For Eswatini (sz)
NEXT_PUBLIC_WP_SZ_GRAPHQL=https://newsonafrica.com/sz/graphql

# For South Africa (za)
NEXT_PUBLIC_WP_ZA_GRAPHQL=https://newsonafrica.com/za/graphql
```

**Important:**
- GraphQL URLs must end with `/graphql` and include the country slug
- Remove any legacy REST-specific variables; they are no longer used

### Verifying the Fix

After making changes, check the server logs for successful GraphQL calls. You should see:
- ✅ GraphQL requests succeeding
- ✅ Correct country slug in all URLs
- ✅ No "Invalid endpoint detected" warnings

### Supabase Connection Errors

**Symptoms:**
- "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL" error

**Solution:**
Ensure your Supabase environment variables are set correctly:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Build or Deployment Failures

**Common causes:**
1. Missing required environment variables
2. TypeScript errors
3. Dependency issues

**Solutions:**
```bash
# Clear cache and reinstall dependencies
rm -rf .next node_modules
npm install

# Run type checking
npm run type-check

# Test build locally
npm run build
```

### Performance Issues

**Symptoms:**
- Slow page loads
- High API response times

**Solutions:**
1. Check WordPress server performance
2. Verify CDN configuration
3. Review caching settings in `lib/cache/constants.ts`
4. Monitor API health at `/api/health`

### Development Server Issues

**Symptoms:**
- Hot reload not working
- Changes not reflecting

**Solutions:**
```bash
# Restart development server
npm run dev

# Clear Next.js cache
rm -rf .next

# Check for port conflicts
lsof -i :3000
```

## Getting Help

If you continue to experience issues:

1. Check the [deployment documentation](./deployment.md)
2. Review the [architecture documentation](./architecture.md)
3. Check server logs for detailed error messages
4. Verify all environment variables are set correctly
5. Open an issue on GitHub with:
   - Error messages
   - Environment (local/Vercel)
   - Steps to reproduce
