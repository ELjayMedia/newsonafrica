# News on Africa - Design System

A comprehensive design system guide for the News on Africa platform, documenting current patterns, tokens, and providing a roadmap for scalable component development.

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Design Tokens](#design-tokens)
4. [Component Architecture](#component-architecture)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Usage Guidelines](#usage-guidelines)

---

## Overview

The News on Africa design system establishes a scalable, maintainable foundation for UI development using:
- **Tailwind CSS v4** with CSS Variables for theming
- **TypeScript** for type-safe component patterns
- **Semantic HTML** with ARIA accessibility standards
- **Multi-variant components** following the compound component pattern

**Design Principles:**
- Mobile-first responsive design
- Semantic theming with light/dark mode support
- Accessibility-first (WCAG 2.1 AA compliance)
- Performance-optimized with lazy loading and code splitting
- Country/region-aware content adaptation

---

## Current State Analysis

### 1. **Existing Component Library**

#### Core Components (High-Quality, Reusable)
- **ArticleCard** - Multi-variant (featured/default/compact), dual-layout (vertical/horizontal), with interactive actions
- **Header/Navigation** - Country-aware category navigation, server-rendered
- **Article Management** - Bookmarks, comments, reactions, share functionality
- **Layout Containers** - AppChrome, EditionLayoutShell, LayoutStructure
- **Feedback Components** - ErrorBoundary, ErrorFallback, OfflineFallback
- **Media Components** - OptimizedImage, FeaturedHero with skeleton loaders
- **Forms** - AuthPageClient, RegisterForm, ProfileEditor, CommentForm

#### Identified Patterns
- **Skeleton Loading**: HeroSkeleton, LatestGridSkeleton, NewsGridSkeleton for progressive enhancement
- **Content Organization**: Section-based layouts (TrendingSection, LatestGridSection, SecondaryStories)
- **Interactive States**: Bookmark buttons with visual feedback, comment sections with moderation
- **Responsive Images**: OptimizedImage with blur placeholders and device-specific sizing

### 2. **Design Tokens (Current)**

#### Color System
**Light Mode:**
- **Primary**: `hsl(142.1 76.2% 36.3%)` - Green (actions, links, accents)
- **Background**: `hsl(0 0% 100%)` - White
- **Foreground**: `hsl(240 10% 3.9%)` - Dark charcoal
- **Card**: White with subtle borders
- **Semantic Colors**: Success (green), Warning (amber), Info (blue), Destructive (red)

**Dark Mode:**
- **Background**: `oklch(0.145 0 0)` - Near black
- **Foreground**: `oklch(0.985 0 0)` - Near white
- **Primary**: White with adjusted interactions
- **Accents**: Muted purples and teals for visual hierarchy

#### Border Radius
- **sm**: `calc(--radius - 4px)` - Compact controls
- **md**: `calc(--radius - 2px)` - Standard components
- **lg**: `--radius` (0.625rem) - Cards, containers
- **xl**: `calc(--radius + 4px)` - Large modals

#### Typography
- **Font Family**: Inter (sans-serif) - System UI fallback
- **Scale**: No separate display fonts; semantic sizing via Tailwind
- **Line Heights**: 1.4-1.6 (leading-relaxed/leading-6) for body text

#### Spacing Scale
Uses Tailwind's default scale:
- **Gap Classes**: `gap-2.5`, `gap-3`, `gap-4`, `gap-5` for component spacing
- **Padding**: `p-3`, `p-4`, `p-5` for content containers
- **Margins**: Minimal use; prefer gap for layout relationships

### 3. **Styling Patterns**

#### Tailwind Implementation
- **Flexbox-first**: Nearly all layouts use `flex` with `items-center`, `justify-between`
- **Responsive Prefixes**: `md:`, `lg:`, `sm:` for screen-size variations
- **CSS Variables**: All colors reference `hsl(var(--token))` for theme support
- **Utility-driven**: Minimal CSS-in-JS; leverages `@apply` only in custom classes

#### Custom Classes (globals.css)
- `.line-clamp-2`, `.line-clamp-3` - Text truncation utilities
- `.scrollbar-hide` - Carousel scroll hiding
- `.image-overlay` - Gradient overlays on images
- `.hover-lift` - Elevation on hover
- `.focus-ring` - Accessible focus states

#### Motion & Accessibility
- **Motion-safe utilities**: `motion-reduce:transition-none` built into utils
- **Focus styles**: 2px outline with ring color, accessible contrast ratios
- **Semantic HTML**: Proper heading hierarchy, ARIA roles, alt text on images

### 4. **Current File Organization**

```
/components
  ├── ArticleCard.tsx              # Multi-variant card
  ├── ArticleCard*.tsx             # Card variants & utilities
  ├── Header*.tsx                  # Navigation & header
  ├── Navigation.tsx               # Navigation patterns
  ├── Skeleton.tsx                 # Base skeleton component
  ├── OptimizedImage.tsx           # Image optimization
  ├── BookmarkButton.tsx           # Interactive action
  ├── ShareButtons.tsx             # Social sharing
  ├── Comment*.tsx                 # Comment section
  ├── Form*.tsx                    # Form components
  ├── Profile*.tsx                 # User profile
  └── __tests__/                   # Component tests

/app/globals.css                   # Design tokens & global styles
/tailwind.config.ts                # Tailwind configuration
/lib/utils.ts                      # Utility functions (cn, formatDate, etc.)
```

---

## Design Tokens

### Extended Token System (Recommended Implementation)

Create a new file `/lib/design-tokens.ts` for centralized token definitions:

```typescript
// lib/design-tokens.ts
export const SPACING = {
  xs: '0.5rem',      // 8px
  sm: '0.75rem',     // 12px
  md: '1rem',        // 16px
  lg: '1.5rem',      // 24px
  xl: '2rem',        // 32px
  '2xl': '2.5rem',   // 40px
  '3xl': '3rem',     // 48px
} as const

export const BORDER_RADIUS = {
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: 'calc(var(--radius) + 4px)',
} as const

export const TYPOGRAPHY = {
  // Display sizes
  'display-lg': { size: '2.25rem', weight: 700, lineHeight: 1.2 },
  'display-md': { size: '1.875rem', weight: 700, lineHeight: 1.2 },
  
  // Heading sizes
  'heading-lg': { size: '1.5rem', weight: 600, lineHeight: 1.4 },
  'heading-md': { size: '1.25rem', weight: 600, lineHeight: 1.4 },
  'heading-sm': { size: '1.125rem', weight: 600, lineHeight: 1.4 },
  
  // Body sizes
  'body-lg': { size: '1rem', weight: 400, lineHeight: 1.6 },
  'body-md': { size: '0.875rem', weight: 400, lineHeight: 1.6 },
  'body-sm': { size: '0.75rem', weight: 400, lineHeight: 1.6 },
} as const

export const TRANSITIONS = {
  fast: '100ms',
  base: '200ms',
  slow: '300ms',
} as const

export const Z_INDEX = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 500,
  fixed: 900,
  modal: 1000,
  tooltip: 1100,
  notification: 1200,
} as const

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

export const ARTICLE_VARIANTS = {
  featured: {
    headline: 'text-lg font-semibold leading-tight md:text-xl',
    excerpt: 'text-sm text-muted-foreground/90 md:text-base',
  },
  default: {
    headline: 'text-base font-semibold leading-snug md:text-lg',
    excerpt: 'text-sm text-muted-foreground/90',
  },
  compact: {
    headline: 'text-sm font-semibold leading-snug md:text-base',
    excerpt: 'text-xs text-muted-foreground/80',
  },
} as const
```

---

## Component Architecture

### 1. **Reusable Component Library Structure**

#### High-Priority Consolidation
**ArticleCard family** (DONE - multi-variant support)
- ✅ Vertical & horizontal layouts
- ✅ Featured, default, compact variants
- ✅ Optional actions (share, save, like)
- ✅ Skeleton loading state

**Navigation Components** (IN PROGRESS)
- ✅ Country-aware Header
- ⏳ Consolidate TopBar, TopNavigation, CategoryMenu
- ⏳ Extract reusable breadcrumb/nav patterns

**Form Components** (TO DO)
- 🎯 Create FormInput wrapper with consistent styling
- 🎯 Create FormSelect with dropdown patterns
- 🎯 Create FormCheckbox, FormRadio with label binding

**Section Containers** (IN PROGRESS)
- ✅ FeaturedHero, SecondaryStories, TrendingSection
- ⏳ Extract to generic `<Section>` wrapper with optional title

### 2. **Compound Component Patterns**

Use TypeScript & React composition for extensible components:

```typescript
// Example: ArticleCard with compound pattern
<ArticleCard href="/article/slug">
  <ArticleCard.Media src="..." alt="..." />
  <ArticleCard.Content>
    <ArticleCard.Category>Technology</ArticleCard.Category>
    <ArticleCard.Headline>Article Title</ArticleCard.Headline>
    <ArticleCard.Excerpt>Summary...</ArticleCard.Excerpt>
    <ArticleCard.Meta timestamp={date} />
    <ArticleCard.Actions>
      <ArticleCard.ShareButton onClick={handleShare} />
      <ArticleCard.BookmarkButton isSaved={saved} onClick={handleSave} />
    </ArticleCard.Actions>
  </ArticleCard.Content>
</ArticleCard>
```

### 3. **Variant System**

All components should support variant-driven styling:

```typescript
interface ComponentProps {
  variant?: 'default' | 'featured' | 'compact'
  size?: 'sm' | 'md' | 'lg'
  state?: 'default' | 'hover' | 'active' | 'disabled'
  className?: string
}
```

### 4. **Props Composition Pattern**

Separate concerns into focused props:

```typescript
interface CardProps {
  // Content
  headline: string
  excerpt?: string
  
  // Visual
  variant?: 'default' | 'featured'
  className?: string
  
  // Behavior
  onClick?: () => void
  href?: string
  
  // Metadata
  category?: string
  timestamp?: Date
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Establish design token system and documentation

- [ ] Create `/lib/design-tokens.ts` with token exports
- [ ] Document all current color palette variants
- [ ] Create `/DESIGN_TOKENS.md` in-component reference guide
- [ ] Update Tailwind config to reference tokens

### Phase 2: Component Consolidation (Weeks 3-5)
**Goal**: Extract and standardize reusable components

- [ ] **Navigation**: Consolidate TopBar, TopNavigation into Header variants
- [ ] **Forms**: Create FormInput, FormSelect, FormCheckbox wrappers
- [ ] **Sections**: Extract SectionContainer with title/actions pattern
- [ ] **Cards**: Create CardBase, CardImage, CardContent compounds
- [ ] **Buttons**: Consolidate button styles into consistent Button component

### Phase 3: Style System Enhancement (Weeks 6-8)
**Goal**: Formalize spacing, typography, and transitions

- [ ] Add typography scale to globals.css as CSS classes
- [ ] Create spacing utility classes
- [ ] Standardize transition/animation utilities
- [ ] Add elevation/shadow utilities

### Phase 4: Template & Pattern Library (Weeks 9-11)
**Goal**: Document patterns and create usage examples

- [ ] Create `/COMPONENT_PATTERNS.md` with compound examples
- [ ] Document dark mode implementation
- [ ] Create responsive design guidelines
- [ ] Build usage examples for each component family

### Phase 5: Accessibility & Testing (Weeks 12-13)
**Goal**: Ensure WCAG compliance and testability

- [ ] Audit components for ARIA attributes
- [ ] Add visual regression tests for components
- [ ] Document accessibility requirements per component
- [ ] Create keyboard navigation patterns

### Phase 6: Performance & Monitoring (Week 14)
**Goal**: Optimize and establish metrics

- [ ] Audit bundle size impact
- [ ] Implement component performance testing
- [ ] Set up design system metrics dashboard
- [ ] Document migration path for existing usage

---

## Usage Guidelines

### 1. **Styling Best Practices**

#### ✅ DO
```typescript
// Use semantic Tailwind classes
<div className="flex items-center justify-between gap-4">
  <h1 className="text-lg font-semibold text-foreground">Title</h1>
</div>

// Use spacing scale
<div className="p-4 md:p-6 gap-3">

// Combine with cn() utility
<div className={cn("bg-card p-4", isActive && "ring-2 ring-primary")}>

// Use motion-safe utilities
<div className="transition-all duration-200 motion-reduce:transition-none">

// Responsive prefixes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

#### ❌ DON'T
```typescript
// Arbitrary values unless necessary
<div className="p-[13px] gap-[5px]">

// Hardcoded colors
<div className="bg-green-500 text-red-600">

// Inline styles
<div style={{ color: '#123456', padding: '10px' }}>

// Mix margin & gap
<div className="gap-4 m-2">  // Confusing!

// Skip ARIA labels
<button onClick={toggle}>X</button>  // Should have aria-label
```

### 2. **Component Naming**

```
ArticleCard.tsx          # Main component
ArticleListCard.tsx      # Variant
LegacyArticleCard.tsx    # Deprecated/legacy
ArticleCard.test.tsx     # Tests
ArticleCard.skeleton.tsx # Loading state (optional)
```

### 3. **Testing Components**

Each component should have basic coverage:
```typescript
describe('ArticleCard', () => {
  it('renders with required props', () => {
    render(<ArticleCard href="/" headline="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
  
  it('handles actions correctly', () => {
    const onSave = vi.fn()
    render(<ArticleCard href="/" headline="Test" onSave={onSave} />)
    fireEvent.click(screen.getByLabelText('Save article'))
    expect(onSave).toHaveBeenCalled()
  })
})
```

### 4. **Accessibility Checklist**

For every component, ensure:
- [ ] Semantic HTML (`<button>`, `<header>`, etc.)
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation support
- [ ] Focus visible styles
- [ ] Color contrast ≥4.5:1
- [ ] Alt text on images (or `aria-hidden` if decorative)
- [ ] Form labels properly associated
- [ ] Error messages linked to inputs

### 5. **Dark Mode Implementation**

All components should support dark mode via CSS class:
```typescript
// Automatic with design tokens
<div className="bg-card text-foreground">
  {/* Automatically adapts to dark mode */}
</div>

// For non-token colors, use dark: prefix
<div className="bg-white dark:bg-slate-950">
```

### 6. **TypeScript Patterns**

```typescript
// Prop types with proper inference
type ArticleCardProps = {
  href: string
  headline: string
  variant?: 'default' | 'featured' | 'compact'
  className?: string
}

// Use as const for variant records
const STYLES = {
  featured: 'text-lg',
  default: 'text-base',
} as const

type Variant = keyof typeof STYLES

// Generic component support
export function Card<T extends Record<string, any>>({ 
  data, 
  render 
}: { 
  data: T[] 
  render: (item: T) => ReactNode 
}) {
  return <>{data.map(render)}</>
}
```

---

## Migration Guide

### Converting Existing Components

1. **Identify** component usage across codebase
2. **Extract** common props and behaviors
3. **Create** variant support with `as const`
4. **Test** all breakpoints (sm, md, lg)
5. **Document** usage examples
6. **Update** imports in affected files
7. **Remove** duplicate implementations

### Example: Consolidating Similar Cards

```typescript
// Before: 3 separate files
ArticleCard.tsx
LegacyArticleCard.tsx
CompactCard.tsx

// After: 1 flexible component
ArticleCard.tsx (with variant="compact" | "default" | "featured")

// Update imports
- import { CompactCard } from '@/components/CompactCard'
+ import { ArticleCard } from '@/components/ArticleCard'

// Usage stays similar
- <CompactCard {...props} />
+ <ArticleCard variant="compact" {...props} />
```

---

## Performance Considerations

### Code Splitting
- Use dynamic imports for large components
- Lazy-load images with priority prop
- Implement route-based code splitting

### Bundle Size
- Tree-shake unused variants
- Monitor component library size
- Use Tailwind's content config for purging

### Runtime Performance
- Memoize expensive renders: `React.memo(ArticleCard)`
- Use `useCallback` for event handlers in lists
- Implement virtual scrolling for large article lists

---

## Continuous Improvement

### Monitoring & Metrics
- Component usage analytics
- Performance metrics (CLS, LCP, FID)
- Accessibility audit scores
- Design system adoption rate

### Feedback Loop
- Collect component usage patterns
- Identify bottleneck components
- Gather designer/developer feedback
- Monthly design system reviews

---

## Quick Reference

### Spacing Scale
```
gap-2.5  → 0.625rem (10px)
gap-3    → 0.75rem  (12px)
gap-4    → 1rem     (16px)
p-4      → 1rem padding all sides
md:p-6   → 1.5rem on medium+ screens
```

### Color Tokens
```
Primary:    hsl(142.1 76.2% 36.3%)    [Green]
Secondary:  hsl(240 4.8% 95.9%)       [Light Gray]
Muted:      hsl(240 4.8% 95.9%)       [Light Gray]
Success:    hsl(142 76% 36%)
Warning:    hsl(38 92% 50%)
Info:       hsl(217 91% 60%)
```

### Responsive Breakpoints
```
sm: 640px   (tablet)
md: 768px   (landscape tablet)
lg: 1024px  (desktop)
xl: 1280px  (wide desktop)
```

---

## Support & Questions

For questions about implementing the design system:
1. Check component examples in `/components`
2. Review token definitions in `/app/globals.css`
3. Refer to Tailwind docs: https://tailwindcss.com
4. Create GitHub discussion for design system proposals
