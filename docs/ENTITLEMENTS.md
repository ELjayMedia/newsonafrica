# Subscription Entitlements System

## Overview

The entitlements system controls access to premium content based on user subscriptions.

## How It Works

### Content Classification

Articles are marked as premium if they have:
- Tag: "premium" or "subscriber"
- Category: "premium" or "subscribers only"

### Access Control Flow

1. **Check if content is premium**
   \`\`\`typescript
   const isPremium = isArticlePremium(article)
   \`\`\`

2. **Check user authentication**
   - Unauthenticated users cannot access premium content
   - Authenticated users proceed to subscription check

3. **Validate subscription**
   \`\`\`typescript
   const check = await checkUserEntitlement(userId)
   if (check.hasAccess) {
     // Grant access
   } else {
     // Show paywall
   }
   \`\`\`

### Subscription Validation

A subscription is considered active if:
- `status === 'active'`
- `renewal_date` is in the future (or NULL)

## Usage

### Server-Side Access Control

\`\`\`typescript
import { validateContentAccess } from '@/lib/entitlements'

export default async function ArticlePage({ params }) {
  const { user } = await getUser()
  const article = await fetchArticle(params.slug)
  
  const access = await validateContentAccess(user?.id, article)
  
  if (!access.hasAccess) {
    return <Paywall reason={access.reason} />
  }
  
  return <ArticleContent article={article} />
}
\`\`\`

### Client-Side Components

\`\`\`typescript
import { checkMyEntitlement } from '@/app/actions/entitlements'
import { Paywall } from '@/components/Paywall'

export function PremiumFeature() {
  const [hasAccess, setHasAccess] = useState(false)
  
  useEffect(() => {
    checkMyEntitlement().then(result => {
      setHasAccess(result.data?.hasAccess ?? false)
    })
  }, [])
  
  if (!hasAccess) {
    return <Paywall variant="feature" />
  }
  
  return <FeatureContent />
}
\`\`\`

### Show Premium Badge

\`\`\`typescript
import { SubscriptionBadge } from '@/components/SubscriptionBadge'
import { isArticlePremium } from '@/lib/entitlements'

export function ArticleCard({ article }) {
  const isPremium = isArticlePremium(article)
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{article.title}</CardTitle>
          {isPremium && <SubscriptionBadge />}
        </div>
      </CardHeader>
      ...
    </Card>
  )
}
\`\`\`

## Caching Strategy

Entitlement checks are cached for 1 minute per user:
- Tag: `user:{userId}`
- Revalidate: 60 seconds
- Invalidate on subscription changes

## Database Functions

### user_has_active_subscription(user_id)

Returns boolean indicating if user has active subscription.

\`\`\`sql
SELECT user_has_active_subscription('user-uuid');
\`\`\`

### get_active_subscription(user_id)

Returns the user's active subscription record.

\`\`\`sql
SELECT * FROM get_active_subscription('user-uuid');
\`\`\`

## Security Considerations

1. **Server-side validation required** - Never trust client-side checks alone
2. **RLS policies** - Database policies prevent direct subscription manipulation
3. **Token expiration** - Subscription checks respect renewal dates
4. **Audit logging** - Consider logging premium content access attempts

## Testing

\`\`\`typescript
// Test subscription validation
const mockUser = { id: 'test-user' }
const mockArticle = {
  tags: [{ name: 'premium' }]
}

const access = await validateContentAccess(mockUser.id, mockArticle)
expect(access.hasAccess).toBe(false)
expect(access.reason).toContain('subscription')
\`\`\`

## Future Enhancements

- Metered access (5 free articles/month)
- Gift subscriptions
- Family plans
- Corporate accounts
- Usage analytics
- A/B testing paywalls
