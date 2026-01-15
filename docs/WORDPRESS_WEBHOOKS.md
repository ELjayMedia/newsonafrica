# WordPress Webhook Integration for ISR Revalidation

## Overview
News On Africa uses WordPress webhooks to trigger on-demand revalidation of cached content in Next.js via Incremental Static Regeneration (ISR) with cache tags.

## Architecture

### Current System
- **Primary Data Source**: WordPress GraphQL (WPGraphQL)
- **Caching Strategy**: Next.js ISR with tag-based cache invalidation
- **Revalidation Trigger**: WordPress webhooks → Next.js API route
- **Fallback**: KV cache for stale content when WordPress is unavailable

### Cache Layers
1. **Next.js Fetch Cache**: Primary layer with tag-based invalidation
2. **Request Memoization**: Deduplicates identical requests within single render
3. **KV Cache**: Persistent stale content for temporary WordPress failures

---

## Setup

### 1. Environment Variables

Add to `.env.local`:
\`\`\`bash
REVALIDATION_SECRET=your-super-secret-key-here-min-32-chars
\`\`\`

**Security Notes:**
- Use a strong random string (min 32 characters)
- Keep this secret between WordPress and Next.js only
- Rotate periodically for security

### 2. WordPress Configuration

Install a webhook plugin or add custom code to trigger revalidation on content updates:

**Recommended Plugins:**
- WP Webhooks Pro
- WP REST API Post Notifier
- Custom code (see example below)

### 3. Webhook Endpoint

\`\`\`
POST https://newsonafrica.com/api/revalidate
\`\`\`

---

## Request Format

### Headers
\`\`\`http
Content-Type: application/json
X-Revalidate-Secret: your-super-secret-key-here
\`\`\`

### Authentication
Secret can be provided via:
1. HTTP Header: `X-Revalidate-Secret` (recommended)
2. JSON payload: `secret` field

---

## Payload Options

### Option 1: Action-Based (Recommended)

WordPress sends an action type and minimal metadata. Next.js automatically generates the correct cache tags.

\`\`\`json
{
  "action": "post_published",
  "country": "sz",
  "post_id": 123,
  "post_slug": "breaking-news-story"
}
\`\`\`

**Supported Actions:**

| Action | Description | Auto-Generated Tags |
|--------|-------------|---------------------|
| `post_published` | New post published | `post:{country}:{id}`, `post-slug:{country}:{slug}`, `home:{country}`, `section:home-feed`, `edition:{country}:posts` |
| `post_updated` | Existing post updated | Same as `post_published` |
| `post_deleted` | Post removed | `post:{country}:{id}`, `post-slug:{country}:{slug}`, `home:{country}`, `edition:{country}:posts` |
| `category_updated` | Category modified | `edition:{country}:category:{slug}`, `edition:{country}:categories` |

### Option 2: Explicit Tags

For advanced use cases, send specific cache tags to revalidate:

\`\`\`json
{
  "tags": ["post:sz:123", "home:sz", "edition:sz:category:politics"]
}
\`\`\`

### Option 3: Mixed Approach

Combine both methods:

\`\`\`json
{
  "action": "post_published",
  "country": "sz",
  "post_id": 123,
  "post_slug": "breaking-news",
  "categories": ["politics", "economy"],
  "sections": ["home-feed", "trending"]
}
\`\`\`

---

## Tag Naming Convention

All tags follow a hierarchical namespace pattern:

| Content Type | Tag Format | Example | Used By |
|--------------|-----------|---------|---------|
| Home Page | `home:{edition}` | `home:sz` | Home page (country edition) |
| Home Feed Section | `section:home-feed` | `section:home-feed` | Pan-African aggregated feed |
| Country Scope | `country:{country}` | `country:sz` | Country-specific content |
| Edition Scope | `edition:{edition}` | `edition:sz` | Edition-wide content |
| Posts List | `edition:{edition}:posts` | `edition:sz:posts` | All posts in edition |
| Post by ID | `edition:{edition}:post:{id}` | `edition:sz:post:123` | Specific article |
| Post by Slug | `edition:{edition}:post-slug:{slug}` | `edition:sz:post-slug:breaking-news` | Specific article |
| Categories List | `edition:{edition}:categories` | `edition:sz:categories` | All categories |
| Category | `edition:{edition}:category:{slug}` | `edition:sz:category:politics` | Category page |
| Author | `edition:{edition}:author:{slug}` | `edition:sz:author:john-doe` | Author page |
| Tags List | `edition:{edition}:tags` | `edition:sz:tags` | All tags |
| Tag | `edition:{edition}:tag:{slug}` | `edition:sz:tag:breaking` | Tag page |
| Comments | `edition:{edition}:comments:{postId}` | `edition:sz:comments:123` | Post comments |

---

## WordPress Plugin Integration

### Example: Custom Functions.php Code

Add to your WordPress theme's `functions.php` or create a custom plugin:

\`\`\`php
<?php
/**
 * News On Africa - Next.js ISR Revalidation
 * Triggers cache invalidation when content changes
 */

// Configuration
define('NEXTJS_REVALIDATE_URL', 'https://newsonafrica.com/api/revalidate');
define('REVALIDATION_SECRET', getenv('REVALIDATION_SECRET'));

// Get country code from multisite
function noa_get_country_code() {
    $site_id = get_current_blog_id();
    
    // Map site IDs to country codes
    $site_map = array(
        1 => 'sz',  // Eswatini
        2 => 'za',  // South Africa
        3 => 'ng',  // Nigeria
        4 => 'zm',  // Zambia
    );
    
    return isset($site_map[$site_id]) ? $site_map[$site_id] : 'sz';
}

// Trigger revalidation
function noa_trigger_revalidation($payload) {
    $response = wp_remote_post(NEXTJS_REVALIDATE_URL, array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-Revalidate-Secret' => REVALIDATION_SECRET,
        ),
        'body' => json_encode($payload),
        'timeout' => 5,
        'blocking' => false, // Non-blocking for better performance
    ));
    
    if (is_wp_error($response)) {
        error_log('NOA Revalidation failed: ' . $response->get_error_message());
    }
}

// Post published/updated
add_action('save_post', 'noa_revalidate_post', 10, 3);
function noa_revalidate_post($post_id, $post, $update) {
    // Only for published posts
    if ($post->post_status !== 'publish' || $post->post_type !== 'post') {
        return;
    }
    
    // Don't trigger on autosave
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    $country = noa_get_country_code();
    $action = $update ? 'post_updated' : 'post_published';
    
    // Get categories
    $categories = wp_get_post_categories($post_id, array('fields' => 'slugs'));
    
    noa_trigger_revalidation(array(
        'action' => $action,
        'country' => $country,
        'post_id' => $post_id,
        'post_slug' => $post->post_name,
        'categories' => $categories,
    ));
}

// Post deleted
add_action('before_delete_post', 'noa_revalidate_post_delete');
function noa_revalidate_post_delete($post_id) {
    $post = get_post($post_id);
    
    if ($post->post_type !== 'post') {
        return;
    }
    
    $country = noa_get_country_code();
    
    noa_trigger_revalidation(array(
        'action' => 'post_deleted',
        'country' => $country,
        'post_id' => $post_id,
        'post_slug' => $post->post_name,
    ));
}

// Category updated
add_action('edited_category', 'noa_revalidate_category');
add_action('create_category', 'noa_revalidate_category');
function noa_revalidate_category($term_id) {
    $term = get_term($term_id, 'category');
    
    if (is_wp_error($term)) {
        return;
    }
    
    $country = noa_get_country_code();
    
    noa_trigger_revalidation(array(
        'action' => 'category_updated',
        'country' => $country,
        'category_slug' => $term->slug,
    ));
}
\`\`\`

---

## Testing

### Using curl

\`\`\`bash
# Test with action-based payload
curl -X POST https://newsonafrica.com/api/revalidate \
  -H "Content-Type: application/json" \
  -H "X-Revalidate-Secret: your-secret-here" \
  -d '{
    "action": "post_updated",
    "country": "sz",
    "post_id": 123,
    "post_slug": "test-article",
    "categories": ["politics", "economy"]
  }'

# Test with explicit tags
curl -X POST https://newsonafrica.com/api/revalidate \
  -H "Content-Type: application/json" \
  -H "X-Revalidate-Secret: your-secret-here" \
  -d '{
    "tags": ["edition:sz:post:123", "home:sz"]
  }'
\`\`\`

### Expected Response

\`\`\`json
{
  "revalidated": true,
  "timestamp": "2026-01-11T12:30:00.000Z",
  "paths": ["/sz/article/test-article"],
  "tags": [
    "edition:sz:category:economy",
    "edition:sz:category:politics",
    "edition:sz:post-slug:test-article",
    "edition:sz:post:123",
    "edition:sz:posts",
    "home:sz",
    "section:home-feed"
  ]
}
\`\`\`

---

## Monitoring

### Server Logs

Check your Next.js logs for revalidation events:

\`\`\`
[api/revalidate] POST 200 - Revalidated 7 tags
Tags: ["edition:sz:post:123", "home:sz", ...]
\`\`\`

### Vercel Logs

If deployed on Vercel, check the Function Logs in your project dashboard:

1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by `/api/revalidate`
3. Look for 200 responses with revalidated tags

### WordPress Logs

Add debugging to track webhook delivery:

\`\`\`php
function noa_trigger_revalidation($payload) {
    $response = wp_remote_post(NEXTJS_REVALIDATE_URL, array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-Revalidate-Secret' => REVALIDATION_SECRET,
        ),
        'body' => json_encode($payload),
        'timeout' => 5,
    ));
    
    if (is_wp_error($response)) {
        error_log('NOA Revalidation failed: ' . $response->get_error_message());
    } else {
        $body = wp_remote_retrieve_body($response);
        error_log('NOA Revalidation success: ' . $body);
    }
}
\`\`\`

---

## Troubleshooting

### 401 Unauthorized

**Problem:** `{"error": "Invalid revalidation secret"}`

**Solutions:**
- Verify `REVALIDATION_SECRET` matches in WordPress and Next.js
- Check the secret is sent in `X-Revalidate-Secret` header
- Ensure secret has no leading/trailing whitespace
- Verify environment variable is loaded (check `.env.local` or Vercel env vars)

### 429 Too Many Requests

**Problem:** Rate limit exceeded

**Solution:** The endpoint allows 10 requests per minute. If you're hitting this limit:
- Batch multiple changes into single webhook
- Increase the rate limit in `app/api/revalidate/route.ts` (line 173)
- Use a queue system for high-traffic sites

### 500 Internal Server Error

**Problem:** Server error during revalidation

**Solutions:**
- Check Next.js server logs for stack traces
- Verify payload is valid JSON
- Ensure all required fields are present
- Check that tag names don't contain invalid characters (only alphanumeric, hyphens, colons, underscores)

### Cache Not Updating

**Problem:** Content changes but pages still show old data

**Solutions:**

1. **Verify correct tags are being revalidated:**
   \`\`\`bash
   curl -v https://newsonafrica.com/api/revalidate \
     -H "X-Revalidate-Secret: your-secret" \
     -H "Content-Type: application/json" \
     -d '{"action":"post_updated","country":"sz","post_id":123,"post_slug":"article-slug"}'
   \`\`\`
   
2. **Check page is using matching tags:**
   - Article pages should use: `edition:sz:post:123` and `edition:sz:post-slug:article-slug`
   - Category pages should use: `edition:sz:category:politics`
   - Home page should use: `home:sz` and `section:home-feed`

3. **Try path-based revalidation as fallback:**
   \`\`\`json
   {
     "path": "/sz/article/article-slug"
   }
   \`\`\`

4. **Clear Next.js cache manually:**
   \`\`\`bash
   # In your Next.js project
   rm -rf .next/cache
   npm run build
   \`\`\`

5. **Check ISR configuration:**
   - Verify pages have `export const revalidate` set
   - Ensure `fetchWordPressGraphQL` is passing tags correctly
   - Confirm Next.js version supports tag-based revalidation (14+)

### Webhook Not Firing

**Problem:** WordPress not sending webhooks

**Solutions:**
- Check PHP error logs: `tail -f /var/log/php-error.log`
- Test webhook manually from WordPress admin
- Verify `wp_remote_post` is not blocked by firewall
- Check if WordPress can reach your Next.js server (test with `wp_remote_get`)

---

## Best Practices

### 1. Granular Tag Strategy
- Use specific tags for targeted revalidation
- Combine post-specific tags with broader scopes (home, category)
- Avoid revalidating entire site unnecessarily

### 2. Non-Blocking Webhooks
\`\`\`php
wp_remote_post(NEXTJS_REVALIDATE_URL, array(
    'blocking' => false,  // Don't wait for response
    'timeout' => 5,
));
\`\`\`

### 3. Batch Related Changes
If updating multiple posts, batch into single webhook:
\`\`\`json
{
  "tags": [
    "edition:sz:post:123",
    "edition:sz:post:124",
    "edition:sz:post:125",
    "home:sz"
  ]
}
\`\`\`

### 4. Monitoring & Alerting
- Set up monitoring for 401/500 errors
- Alert if revalidation webhook fails repeatedly
- Track revalidation frequency to optimize ISR times

### 5. Security
- Use HTTPS only
- Rotate revalidation secret periodically
- Implement IP whitelisting if possible
- Monitor for suspicious revalidation patterns

---

## Advanced Configuration

### Custom Revalidation Logic

For complex scenarios, extend the revalidation endpoint:

\`\`\`typescript
// app/api/revalidate/route.ts

// Add custom action
case "homepage_refresh":
  // Revalidate all edition home pages
  ["sz", "za", "ng", "zm"].forEach((country) => {
    tagsToRevalidate.add(cacheTags.home(country))
    tagsToRevalidate.add(cacheTags.posts(country))
  })
  break
\`\`\`

### Scheduled Revalidation

For time-sensitive content (e.g., hourly news digest), use cron:

\`\`\`bash
# Cron job to revalidate home page every hour
0 * * * * curl -X POST https://newsonafrica.com/api/revalidate \
  -H "X-Revalidate-Secret: $REVALIDATION_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tags":["home:sz","home:za","home:ng","home:zm"]}'
\`\`\`

---

## Migration from Old System

If migrating from a previous caching system:

1. **Update tag names** in existing pages to match new convention
2. **Test revalidation** with sample webhooks
3. **Monitor** cache hit rates in production
4. **Gradually migrate** country by country
5. **Document** custom tags for your team

---

## Support

For issues with this system:
1. Check this documentation first
2. Review Next.js ISR documentation: https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating
3. Check WordPress webhook logs
4. Contact the development team with specific error messages and logs
