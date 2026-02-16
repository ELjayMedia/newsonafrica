# Design System Quick Reference

A one-page guide for developers to quickly access common design patterns and tokens.

---

## Design Tokens

### Spacing Scale (Gap/Padding)
```
gap-2.5  → 0.625rem (10px)    p-2.5  → padding: 0.625rem
gap-3    → 0.75rem  (12px)    p-3    → padding: 0.75rem
gap-4    → 1rem     (16px)    p-4    → padding: 1rem
gap-6    → 1.5rem   (24px)    p-6    → padding: 1.5rem
```

### Colors (Use CSS Variables)
```
Primary:      bg-primary text-primary-foreground       (Green)
Secondary:    bg-secondary text-secondary-foreground   (Light gray)
Muted:        bg-muted text-muted-foreground
Destructive:  bg-destructive text-destructive-foreground (Red)
Success:      bg-success-DEFAULT text-success-foreground
Warning:      bg-warning-DEFAULT text-warning-foreground
Info:         bg-info-DEFAULT text-info-foreground
```

### Border Radius
```
rounded-sm   → calc(--radius - 4px)   (smaller corners)
rounded-md   → calc(--radius - 2px)
rounded-lg   → var(--radius)          (10px - standard)
rounded-xl   → calc(--radius + 4px)
rounded-full → 9999px                 (fully rounded)
```

### Responsive Breakpoints
```
Base (mobile)     sm:640px (tablet)    md:768px    lg:1024px    xl:1280px    2xl:1536px
```

---

## Component Variants

### ArticleCard
```typescript
// Import
import { ArticleCard } from '@/components/ArticleCard'

// Basic usage
<ArticleCard
  href="/article/slug"
  headline="Article Title"
  category="Technology"
  timestamp={new Date()}
  image={{ src: '/image.jpg', alt: 'Article' }}
/>

// With variants
variant="featured"    // Large, prominent
variant="default"     // Standard (default)
variant="compact"     // Small, condensed

// With layouts
layout="vertical"     // Image on top (mobile default)
layout="horizontal"   // Image on side (desktop default)

// With actions
onShare={() => {}}    // Share button
onSave={() => {}}     // Bookmark button
onLike={() => {}}     // Like button
isSaved={true}        // Show saved state
isLiked={false}       // Show liked state
```

### Button
```typescript
// Import
import { Button } from '@/components/ui/button'

// Basic usage
<Button variant="primary">Click me</Button>

// Variants
variant="default"      // Secondary background
variant="primary"      // Green background
variant="destructive"  // Red background
variant="outline"      // Bordered only
variant="ghost"        // No background

// Sizes
size="xs"   // Small (8px height)
size="sm"   // Small (10px)
size="md"   // Medium (16px) - default
size="lg"   // Large (12px)
size="xl"   // Extra large (14px)

// States
disabled={true}        // Disabled state
isLoading={true}       // Loading spinner
```

### Form Input
```typescript
// Import
import { Input } from '@/components/ui/input'

// Basic usage
<Input
  label="Email"
  type="email"
  placeholder="your@email.com"
  error={errorMessage}
  helperText="We'll never share your email"
/>

// Props
label="Label text"     // Input label
error="Error message"  // Shows error state
helperText="Helper"    // Gray helper text
required={true}        // Show required indicator
disabled={true}        // Disabled state
```

---

## Responsive Patterns

### Mobile-First Grid
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {/* Single column on mobile, 2 on tablet, 3 on desktop, 4 on wide */}
</div>
```

### Responsive Text
```tsx
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Title that grows on larger screens
</h1>
```

### Responsive Padding
```tsx
<div className="p-4 md:p-6 lg:p-8">
  {/* 16px on mobile, 24px on tablet, 32px on desktop */}
</div>
```

### Hide/Show by Breakpoint
```tsx
<div className="hidden md:block">
  {/* Hidden on mobile, shown on tablet+ */}
</div>

<div className="block md:hidden">
  {/* Shown on mobile, hidden on tablet+ */}
</div>
```

---

## Accessibility Essentials

### Every Interactive Element Needs a Label
```tsx
// ✅ Good - Has aria-label
<button onClick={share} aria-label="Share article">
  <Share2 className="h-4 w-4" aria-hidden="true" />
</button>

// ❌ Bad - No label
<button onClick={share}>
  <Share2 className="h-4 w-4" />
</button>
```

### Form Fields Must Be Labeled
```tsx
// ✅ Good - Proper label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ❌ Bad - No connection
<label>Email</label>
<input type="email" />
```

### Images Need Alt Text
```tsx
// ✅ Good - Describes image
<img src="/article.jpg" alt="Breaking news headline" />

// ✅ Good - Decorative, hidden
<img src="/icon.svg" alt="" aria-hidden="true" />

// ❌ Bad - Missing alt
<img src="/article.jpg" />
```

### Focus Management
```tsx
// ✅ Good - Visible focus ring
<button className="focus:outline-none focus:ring-2 focus:ring-primary">
  Click me
</button>

// ❌ Bad - Removed focus
<button className="focus:outline-none">
  Click me
</button>
```

### Semantic HTML
```tsx
// ✅ Good - Semantic tags
<header>...</header>
<nav>...</nav>
<main>...</main>
<article>...</article>
<footer>...</footer>

// ❌ Bad - Everything is a div
<div role="header">...</div>
<div role="navigation">...</div>
```

---

## Common Patterns

### Card with Badge
```tsx
<div className="rounded-lg border border-border bg-card p-4">
  <div className="mb-2 flex items-start justify-between">
    <Badge className="uppercase tracking-wide">Category</Badge>
    <button aria-label="Save">
      <Bookmark className="h-4 w-4" />
    </button>
  </div>
  <h3 className="text-lg font-semibold">Title</h3>
  <p className="text-sm text-muted-foreground">Description</p>
</div>
```

### Hover Lift Effect
```tsx
<div className="rounded-lg border border-border transition-all hover:-translate-y-0.5 hover:shadow-md">
  {/* Content */}
</div>
```

### Gradient Overlay on Image
```tsx
<div className="relative overflow-hidden rounded-lg">
  <Image src={url} alt="..." fill className="object-cover" />
  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
</div>
```

### Loading Skeleton
```tsx
import { Skeleton } from '@/components/Skeleton'

<div className="space-y-4">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

### Error State
```tsx
<div className="rounded-lg bg-destructive/10 p-4 text-destructive">
  <h3 className="font-semibold">Error loading content</h3>
  <p className="text-sm">Please try again or contact support</p>
</div>
```

### Empty State
```tsx
<div className="text-center py-12">
  <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
  <h3 className="font-semibold mb-1">No results found</h3>
  <p className="text-sm text-muted-foreground">Try adjusting your search</p>
</div>
```

---

## Utility Functions

### Combine Classes Safely
```typescript
import { cn } from '@/lib/utils'

// Combine classes with Tailwind merge support
<div className={cn(
  'p-4 rounded-lg',           // Base styles
  isActive && 'bg-primary',   // Conditional
  className                   // User override
)}>
```

### Format Dates
```typescript
import { formatDate } from '@/lib/utils'

formatDate('2024-02-16')  // "2 days ago"
formatDate(new Date())    // "Just now"
```

### Slugify Text
```typescript
import { slugify } from '@/lib/utils'

slugify('Hello World!')  // "hello-world"
```

### Get Design Token
```typescript
import { ARTICLE_VARIANTS, getResponsiveClasses } from '@/lib/design-tokens-extended'

// Use variant styles
const { headline, excerpt } = ARTICLE_VARIANTS.featured

// Build responsive classes
const gridClasses = getResponsiveClasses({
  base: 'grid-cols-1',
  md: 'grid-cols-2',
  lg: 'grid-cols-3',
})
```

---

## TypeScript Tips

### Component Props
```typescript
interface ArticleCardProps {
  // Required
  href: string
  headline: string
  
  // Optional with sensible defaults
  variant?: 'featured' | 'default' | 'compact'
  layout?: 'vertical' | 'horizontal'
  
  // Optional actions
  onShare?: () => void
  onSave?: () => void
  
  // States
  isSaved?: boolean
  isLiked?: boolean
}

// Usage
<ArticleCard
  href="/article"
  headline="Title"
  variant="featured"
  onShare={handleShare}
/>
```

### Type-Safe Variants
```typescript
// ✅ Good - TypeScript validates variant
const VARIANTS = {
  featured: 'text-lg',
  default: 'text-base',
  compact: 'text-sm',
} as const

type Variant = keyof typeof VARIANTS  // 'featured' | 'default' | 'compact'

function Card({ variant = 'default' }: { variant?: Variant }) {
  return <div className={VARIANTS[variant]} />
}

// ❌ Bad - No type safety
function Card({ variant = 'default' }: { variant?: string }) {
  return <div className={VARIANTS[variant]} />  // Unsafe!
}
```

---

## Performance Tips

### Lazy Load Heavy Components
```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./Chart'), {
  loading: () => <Skeleton className="h-96" />,
})

export default function Page() {
  return <HeavyChart />  // Loaded on demand
}
```

### Optimize Images
```typescript
import Image from 'next/image'

<Image
  src={url}
  alt="Article"
  fill
  sizes="(max-width: 640px) 100vw, 1000px"  // ✅ Responsive sizes
  priority={false}                           // ✅ Lazy load
  placeholder="blur"                         // ✅ Show blur while loading
/>
```

### Memoize Expensive Renders
```typescript
import { memo } from 'react'

export const ArticleCardMemo = memo(ArticleCard)

// Usage in lists
<ArticleCardMemo key={article.id} {...props} />
```

---

## Resources

- **Full Design System**: See `DESIGN_SYSTEM.md`
- **Implementation Patterns**: See `COMPONENT_PATTERNS.md`
- **Strategic Roadmap**: See `DESIGN_SYSTEM_STRATEGY.md`
- **Token Exports**: See `lib/design-tokens-extended.ts`
- **Tailwind Docs**: https://tailwindcss.com
- **React Docs**: https://react.dev
- **Accessibility**: https://www.w3.org/WAI/WCAG21/quickref/

---

## Cheat Sheet

```
Component        File                      Status
─────────────────────────────────────────────────────
ArticleCard      components/ArticleCard    ✅ Multi-variant
Button           components/ui/button      📋 To implement
Input            components/ui/input       📋 To implement
Card             components/ui/card        ✅ Exists
Badge            components/ui/badge       ✅ Exists
Skeleton         components/Skeleton       ✅ Exists
Header           components/Header         ✅ Multi-variant
Navigation       components/Navigation     ✅ Exists
Footer           components/Footer         ✅ Exists
ErrorBoundary    components/ErrorBoundary  ✅ Exists
```

---

## Quick Links

- **Tokens**: `lib/design-tokens-extended.ts`
- **Examples**: `components/ArticleCard.tsx`
- **Globals**: `app/globals.css`
- **Tailwind Config**: `tailwind.config.ts`
- **Utils**: `lib/utils.ts`

---

**Last Updated**: February 2026  
**Version**: 1.0  
**Maintained By**: Design System Team
