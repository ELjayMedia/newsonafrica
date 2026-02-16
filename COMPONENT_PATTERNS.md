# Component Patterns & Implementation Guide

This guide provides practical patterns and examples for implementing components in the News on Africa design system.

---

## Table of Contents

1. [Compound Component Pattern](#compound-component-pattern)
2. [Variant System](#variant-system)
3. [Responsive Design Patterns](#responsive-design-patterns)
4. [Interactive Components](#interactive-components)
5. [Accessible Components](#accessible-components)
6. [Testing Patterns](#testing-patterns)
7. [Performance Optimization](#performance-optimization)

---

## Compound Component Pattern

Compound components provide flexibility while maintaining encapsulation. Use this pattern for complex components with multiple sub-components.

### Example: ArticleCard (Existing - Best Practice Reference)

**Current Implementation** - Already follows compound pattern:

```typescript
// Usage:
<ArticleCard
  href="/article/slug"
  headline="Article Title"
  excerpt="Summary text"
  category="Technology"
  timestamp="2024-02-16"
  image={{ src: '/image.jpg', alt: 'Article' }}
  variant="featured"
  layout="vertical"
  onShare={() => console.log('shared')}
  onSave={() => console.log('saved')}
  isSaved={isBookmarked}
/>
```

**Key Strengths:**
- ✅ Clear prop structure with variants
- ✅ Optional actions composable
- ✅ Responsive layout support (vertical/horizontal)
- ✅ Multiple size variants (featured/default/compact)
- ✅ ARIA labels on interactive elements
- ✅ Skeleton loading support via `ArticleSkeleton.tsx`

**To Further Improve** - Convert to true compound:

```typescript
// Enhanced API (future refactor):
<ArticleCard href="/article/slug" variant="featured">
  <ArticleCard.Media src="/image.jpg" alt="Article" />
  <ArticleCard.Content>
    <ArticleCard.Category>Technology</ArticleCard.Category>
    <ArticleCard.Headline>Article Title</ArticleCard.Headline>
    <ArticleCard.Excerpt>Summary text</ArticleCard.Excerpt>
    <ArticleCard.Meta timestamp={date} />
    <ArticleCard.Actions>
      <ArticleCard.ShareButton onClick={handleShare} />
      <ArticleCard.SaveButton isSaved={saved} onClick={handleSave} />
    </ArticleCard.Actions>
  </ArticleCard.Content>
</ArticleCard>
```

---

## Variant System

Implement component variants using TypeScript `as const` for type-safe styling.

### Pattern: Button Component (Template for New Components)

```typescript
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { type ButtonVariant, type ComponentSize, BUTTON_SIZES } from '@/lib/design-tokens-extended'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ComponentSize
  isLoading?: boolean
  children: ReactNode
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  default: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
}

export function Button({
  variant = 'default',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const sizeConfig = BUTTON_SIZES[size]
  
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-all duration-200 motion-reduce:transition-none',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        
        // Size
        `${sizeConfig.padding} ${sizeConfig.fontSize} ${sizeConfig.height}`,
        
        // Variant
        BUTTON_VARIANTS[variant],
        
        // States
        isLoading && 'opacity-75 cursor-wait',
        
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
}
```

### Pattern: Semantic Naming

```typescript
// ✅ DO - Semantic names describe purpose
interface CardProps {
  headline: string
  excerpt?: string
  category?: string
  timestamp?: Date
  variant?: 'featured' | 'default' | 'compact'
}

// ❌ DON'T - Generic names hide purpose
interface CardProps {
  title: string
  text?: string
  label?: string
  date?: Date
  type?: 'a' | 'b' | 'c'
}
```

---

## Responsive Design Patterns

### Mobile-First Approach

Always start with mobile styles, then enhance with responsive prefixes:

```typescript
// ✅ DO - Mobile-first
<div className="
  // Mobile base
  flex flex-col gap-2 p-3
  // Tablet
  md:flex-row md:gap-4 md:p-4
  // Desktop
  lg:gap-6 lg:p-6
">

// ❌ DON'T - Desktop-first
<div className="
  // Desktop base
  flex flex-row gap-6 p-6
  // Override on mobile
  sm:flex-col sm:gap-2 sm:p-3
">
```

### Responsive Image Sizing

```typescript
import Image from 'next/image'

export function ArticleImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-muted aspect-video">
      <Image
        src={src}
        alt={alt}
        fill
        priority
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="
          (max-width: 640px) 100vw,
          (max-width: 1024px) 80vw,
          1000px
        "
      />
    </div>
  )
}
```

### Responsive Container Grid

```typescript
import { getResponsiveClasses } from '@/lib/design-tokens-extended'

export function ArticleGrid({ children }: { children: ReactNode }) {
  return (
    <div className={cn(
      'grid gap-4',
      getResponsiveClasses({
        base: 'grid-cols-1',      // Mobile: 1 column
        md: 'grid-cols-2',         // Tablet: 2 columns
        lg: 'grid-cols-3',         // Desktop: 3 columns
        xl: 'grid-cols-4',         // Wide: 4 columns
      })
    )}>
      {children}
    </div>
  )
}
```

---

## Interactive Components

### Form Input Pattern

```typescript
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random()}`
    
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded-lg border border-input bg-background',
            'text-base text-foreground placeholder:text-muted-foreground',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'aria-invalid:border-destructive aria-invalid:focus:ring-destructive',
            error && 'border-destructive focus:ring-destructive',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
```

### Bookmark Button Pattern (Existing - Reference)

```typescript
// From BookmarkButton.tsx - Good pattern for state-based UI
<button
  onClick={handleBookmark}
  className={cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-full",
    "bg-muted/60 text-muted-foreground transition-colors",
    "hover:bg-muted hover:text-foreground",
    isSaved && "text-primary"  // Conditional active state
  )}
  aria-pressed={isSaved}
  aria-label={isSaved ? "Remove bookmark" : "Save article"}
>
  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
</button>
```

---

## Accessible Components

### Semantic HTML Requirements

```typescript
// ✅ DO - Use semantic HTML
export function Header() {
  return (
    <header className="border-b border-border">
      <nav aria-label="Main navigation" className="flex gap-4">
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to main content
        </a>
        {/* Navigation items */}
      </nav>
    </header>
  )
}

// ❌ DON'T - Use divs for everything
export function Header() {
  return (
    <div className="border-b border-border" role="banner">
      <div role="navigation" aria-label="Main navigation" className="flex gap-4">
        {/* Navigation items */}
      </div>
    </div>
  )
}
```

### ARIA Labels & Descriptions

```typescript
// Interactive buttons need accessible labels
<button
  aria-label="Share article"
  onClick={handleShare}
  className="p-2 hover:bg-muted rounded"
>
  <Share2 className="h-4 w-4" aria-hidden="true" />
</button>

// Form inputs need labels
<label htmlFor="search" className="sr-only">
  Search articles
</label>
<input
  id="search"
  type="text"
  placeholder="Search..."
  aria-describedby="search-help"
/>
<p id="search-help" className="text-xs text-muted-foreground">
  Enter keywords to search articles
</p>

// Decorative images should be hidden
<img src="/icon.svg" alt="" aria-hidden="true" />

// Important images need alt text
<img src="/article.jpg" alt="Breaking news: Economic impact analysis" />
```

### Focus Management

```typescript
import { useRef } from 'react'

export function Modal({ isOpen, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  
  if (!isOpen) return null
  
  return (
    <div
      className="fixed inset-0 bg-black/50 z-modal"
      onClick={onClose}
      role="presentation"
    >
      <dialog
        ref={dialogRef}
        className="bg-background rounded-lg p-6 max-w-md w-full"
        open
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h2 className="text-lg font-semibold mb-4">Dialog Title</h2>
        <p>Modal content here</p>
        
        <div className="flex gap-2 mt-6">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleConfirm} autoFocus>
            Confirm
          </button>
        </div>
      </dialog>
    </div>
  )
}
```

---

## Testing Patterns

### Component Test Template

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArticleCard } from '@/components/ArticleCard'

describe('ArticleCard', () => {
  const defaultProps = {
    href: '/article/test-slug',
    headline: 'Test Article',
    category: 'Technology',
  }

  it('renders with required props', () => {
    render(<ArticleCard {...defaultProps} />)
    
    expect(screen.getByText('Test Article')).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()
  })

  it('links to correct article', () => {
    render(<ArticleCard {...defaultProps} />)
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/article/test-slug')
  })

  it('handles save action', async () => {
    const onSave = vi.fn()
    render(<ArticleCard {...defaultProps} onSave={onSave} />)
    
    const saveButton = screen.getByLabelText('Save article')
    await userEvent.click(saveButton)
    
    expect(onSave).toHaveBeenCalled()
  })

  it('shows saved state visually', () => {
    render(<ArticleCard {...defaultProps} isSaved={true} />)
    
    const saveButton = screen.getByLabelText('Remove bookmark')
    expect(saveButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders featured variant with correct styles', () => {
    const { container } = render(
      <ArticleCard {...defaultProps} variant="featured" />
    )
    
    const heading = screen.getByText('Test Article')
    expect(heading).toHaveClass('text-lg', 'md:text-xl')
  })

  it('responds to keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<ArticleCard {...defaultProps} onShare={() => {}} />)
    
    const shareButton = screen.getByLabelText('Share article')
    
    await user.tab()
    expect(shareButton).toHaveFocus()
  })

  it('supports mobile and desktop layouts', () => {
    const { rerender } = render(
      <ArticleCard {...defaultProps} layout="vertical" />
    )
    
    let article = screen.getByRole('article') // or use container
    expect(article).toHaveClass('flex-col')
    
    rerender(<ArticleCard {...defaultProps} layout="horizontal" />)
    article = screen.getByRole('article')
    expect(article).toHaveClass('flex-row')
  })
})
```

### Visual Regression Testing

```typescript
// vitest + @storybook/test-runner
import { expect, it, describe } from 'vitest'
import { render } from '@testing-library/react'
import { ArticleCard } from '@/components/ArticleCard'

describe('ArticleCard Visual Tests', () => {
  it('matches snapshot for featured variant', () => {
    const { container } = render(
      <ArticleCard
        href="/test"
        headline="Test"
        variant="featured"
      />
    )
    
    expect(container.firstChild).toMatchSnapshot()
  })

  it('matches snapshot for dark mode', () => {
    const { container } = render(
      <div className="dark">
        <ArticleCard href="/test" headline="Test" />
      </div>
    )
    
    expect(container.firstChild).toMatchSnapshot()
  })
})
```

---

## Performance Optimization

### Code Splitting

```typescript
// components/Heavy.tsx - Large component
export function HeavyComponent() {
  // Complex rendering logic
  return <div>Heavy content</div>
}

// components/index.ts - Export with dynamic import
export { ArticleCard } from './ArticleCard' // Small, always load
export const HeavyComponent = dynamic(
  () => import('./Heavy').then(mod => mod.HeavyComponent),
  { loading: () => <Skeleton /> }
)
```

### Memoization

```typescript
import { memo } from 'react'

// Memoize expensive list items
export const ArticleCardMemo = memo(ArticleCard, (prevProps, nextProps) => {
  // Return true if props are equal (don't re-render)
  return (
    prevProps.href === nextProps.href &&
    prevProps.headline === nextProps.headline &&
    prevProps.isSaved === nextProps.isSaved
  )
})

// Usage in lists
export function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <div className="space-y-4">
      {articles.map(article => (
        <ArticleCardMemo
          key={article.id}
          href={`/article/${article.slug}`}
          headline={article.title}
          {...article}
        />
      ))}
    </div>
  )
}
```

### Virtual Scrolling for Large Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function LargeArticleList({ articles }: { articles: Article[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Article card height
  })

  return (
    <div
      ref={parentRef}
      className="h-screen overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <ArticleCard
            key={articles[virtualItem.index].id}
            {...articles[virtualItem.index]}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## Implementation Checklist

Before shipping a new component:

- [ ] **Props** - Clear, semantic naming; TypeScript types defined
- [ ] **Variants** - Supported via `as const` variant records
- [ ] **Responsive** - Mobile-first, tested at sm/md/lg breakpoints
- [ ] **Accessibility** - ARIA labels, semantic HTML, keyboard nav
- [ ] **States** - Handles hover, active, disabled, loading
- [ ] **Dark Mode** - Uses CSS variables, tested in dark mode
- [ ] **Tests** - Unit tests + visual regression coverage
- [ ] **Performance** - Lazy loads if needed, optimizes images
- [ ] **Documentation** - Usage examples in Storybook or JSDoc
- [ ] **Integration** - Works with existing components

---

## Quick Wins - Start Here

1. **Extract ArticleCard variants** - Convert LegacyArticleCard and CompactCard to variant support
2. **Create Button wrapper** - Consolidate button styles across components
3. **Form components** - Create reusable Input, Select, Checkbox
4. **Section container** - Generic wrapper for content sections
5. **Skeleton loaders** - Standardize loading states

Each of these can be implemented incrementally without breaking existing code.
