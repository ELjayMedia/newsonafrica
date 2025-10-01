# Troubleshooting Guide

## Common Issues and Solutions

### GraphQL 404 Errors / REST Fallback Issues

**Symptoms:**
- Seeing "GraphQL endpoint appears to be REST API, skipping GraphQL" in logs
- REST requests failing with 404 errors
- Missing country slug in API URLs (e.g., `/wp-json/wp/v2/posts` instead of `/sz/wp-json/wp/v2/posts`)

**Root Cause:**
The environment variables `NEXT_PUBLIC_WORDPRESS_API_URL` and `WORDPRESS_REST_API_URL` are set to incorrect values that don't include the country slug or point to the wrong endpoint type.

**Solution:**

#### Option 1: Remove the Malformed Environment Variables (Recommended)
The application has built-in defaults that construct the correct URLs. Simply remove or unset these environment variables:

In Vercel:
1. Go to Project Settings → Environment Variables
2. Delete or unset:
   - `NEXT_PUBLIC_WORDPRESS_API_URL`
   - `WORDPRESS_REST_API_URL`
3. Redeploy your application

The app will automatically use the correct defaults:
- GraphQL: `https://newsonafrica.com/{country}/graphql`
- REST: `https://newsonafrica.com/{country}/wp-json/wp/v2`

#### Option 2: Set Correct Values
If you need to override the defaults, ensure the URLs follow this pattern:

\`\`\`bash
# For Eswatini (sz)
NEXT_PUBLIC_WORDPRESS_API_URL=https://newsonafrica.com/sz/graphql
WORDPRESS_REST_API_URL=https://newsonafrica.com/sz/wp-json/wp/v2

# For South Africa (za)
NEXT_PUBLIC_WORDPRESS_API_URL=https://newsonafrica.com/za/graphql
WORDPRESS_REST_API_URL=https://newsonafrica.com/za/wp-json/wp/v2
\`\`\`

**Important:** 
- GraphQL URLs must end with `/graphql` and include the country slug
- REST URLs must include `/wp-json/wp/v2` and the country slug
- The system will automatically detect and ignore malformed URLs

#### Option 3: Use Country-Specific Variables
For multi-country setups, use country-specific environment variables:

\`\`\`bash
NEXT_PUBLIC_WORDPRESS_API_URL_SZ=https://newsonafrica.com/sz/graphql
NEXT_PUBLIC_WORDPRESS_API_URL_ZA=https://newsonafrica.com/za/graphql
WORDPRESS_REST_API_URL_SZ=https://newsonafrica.com/sz/wp-json/wp/v2
WORDPRESS_REST_API_URL_ZA=https://newsonafrica.com/za/wp-json/wp/v2
\`\`\`

### Verifying the Fix

After making changes, check the server logs for:
\`\`\`
[v0] WordPress endpoints for sz: {
  graphql: 'https://newsonafrica.com/sz/graphql',
  rest: 'https://newsonafrica.com/sz/wp-json/wp/v2'
}
\`\`\`

You should see:
- ✅ GraphQL requests succeeding
- ✅ Correct country slug in all URLs
- ✅ No "Invalid endpoint detected" warnings

### Supabase Connection Errors

**Symptoms:**
- "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL" error

**Solution:**
Ensure your Supabase environment variables are set correctly:

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

### Build or Deployment Failures

**Common causes:**
1. Missing required environment variables
2. TypeScript errors
3. Dependency issues

**Solutions:**
\`\`\`bash
# Clear cache and reinstall dependencies
rm -rf .next node_modules
npm install

# Run type checking
npm run type-check

# Test build locally
npm run build
\`\`\`

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
\`\`\`bash
# Restart development server
npm run dev

# Clear Next.js cache
rm -rf .next

# Check for port conflicts
lsof -i :3000
\`\`\`

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
