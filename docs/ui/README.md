# UI System and Reusable Components

This document describes the comprehensive UI refactor that standardizes styling, eliminates duplicate components, and improves maintainability across the News On Africa platform.

## Goals

- **Centralize design tokens** (colors, typography, spacing, radius, shadows)
- **Eliminate duplicate UI components** by creating unified, flexible alternatives
- **Ensure mobile-first responsiveness** across all components
- **Optimize imports** and remove unused styles/props
- **Provide clear documentation** for future contributors and scaling

## Design Token System

### Location: `components/ui/design-tokens.ts`

The new design token system provides:

- **Semantic color tokens** that reference CSS variables from globals.css
- **Typography scales** for consistent text sizing and hierarchy
- **Spacing system** for padding, margins, and gaps
- **Component-specific tokens** for common UI patterns
- **Utility functions** for combining token classes

### Usage Example:

\`\`\`tsx
import { designTokens, componentStyles, combineTokens } from "@/components/ui/design-tokens"

function ExampleCard() {
  return (
    <div className={componentStyles.cardInteractive}>
      <h2 className={designTokens.typography.headline.large}>Title</h2>
      <p className={combineTokens(
        designTokens.typography.body.medium,
        designTokens.colors.text.muted
      )}>
        Body text with consistent styling
      </p>
    </div>
  )
}
\`\`\`

## Unified Component System

### UnifiedCard Component

**Location:** `components/ui/unified-card.tsx`

Replaces three separate card components (CompactCard, HorizontalCard, VerticalCard) with a single, flexible component:

**Variants:**
- `horizontal` - Side-by-side image and content layout
- `vertical` - Stacked image-over-content layout  
- `minimal` - Compact list-style layout
- `featured` - Large hero-style layout

**Props:**
- `variant` - Layout style
- `showExcerpt` - Display post excerpt
- `showAuthor` - Display author information
- `showCategory` - Display category badge
- `showDate` - Display publication date
- `imageAspect` - Image aspect ratio control
- `allowHtml` - Allow HTML in excerpts

### Legacy Component Compatibility

The original components now act as thin wrappers around UnifiedCard:

\`\`\`tsx
// CompactCard.tsx - maintains backward compatibility
export function CompactCard({ layout = "horizontal", ...props }: CompactCardProps) {
  return <UnifiedCard {...props} variant={layout} />
}
\`\`\`

This ensures **zero breaking changes** while enabling the new unified system.

## Sidebar Widget System

### SidebarWidget Component

**Location:** `components/ui/sidebar-widget.tsx`

Standardized container for sidebar sections with:
- Consistent card styling and shadows
- Centered title with blue accent underline
- Proper spacing and mobile responsiveness

### HeadlineList Component

**Location:** `components/ui/headline-list.tsx`

Reusable numbered list component featuring:
- Large, muted numbers in left column
- Multi-line headline links in right column
- Configurable item limits and numbering
- Accessibility-focused markup

### MostRead Component

**Location:** `components/most-read.tsx`

Enhanced with:
- Resilient data fetching (tries multiple endpoints)
- Consistent loading skeleton using design tokens
- Graceful error handling and fallbacks

## Mobile-First Responsiveness

All components follow mobile-first principles:

- **Base styles** target mobile (320px+)
- **Breakpoint enhancements** for tablet (768px+) and desktop (1024px+)
- **Flexible layouts** that adapt to container constraints
- **Touch-friendly** interaction targets (44px minimum)

### Responsive Patterns:

\`\`\`tsx
// Mobile-first grid that adapts to larger screens
className={designTokens.layout.grid.responsive} // grid-cols-1 sm:grid-cols-2 lg:grid-cols-3

// Flexible card layouts
<UnifiedCard variant="vertical" /> // Stacks on mobile, maintains aspect on desktop
\`\`\`

## Import Optimization

### Before (Problematic):
\`\`\`tsx
import { CompactCard } from "@/components/CompactCard"
import { HorizontalCard } from "@/components/HorizontalCard" 
import { VerticalCard } from "@/components/VerticalCard"
// Multiple similar components with overlapping functionality
\`\`\`

### After (Optimized):
\`\`\`tsx
import { UnifiedCard } from "@/components/ui/unified-card"
// Single component handles all card layouts
\`\`\`

## Migration Guide

### For Existing Components:

1. **Replace hardcoded Tailwind classes** with design tokens:
   \`\`\`tsx
   // Before
   className="bg-white border border-gray-200 rounded-lg shadow-sm"
   
   // After  
   className={componentStyles.cardBase}
   \`\`\`

2. **Use semantic color tokens** instead of specific colors:
   \`\`\`tsx
   // Before
   className="text-gray-600"
   
   // After
   className={designTokens.colors.text.muted}
   \`\`\`

3. **Adopt unified components** for new features:
   \`\`\`tsx
   // Use UnifiedCard for all card layouts
   <UnifiedCard variant="horizontal" showExcerpt={true} />
   \`\`\`

### For New Components:

1. **Import design tokens** at the top of your component
2. **Use componentStyles** for common patterns
3. **Follow mobile-first** responsive design
4. **Include accessibility** considerations (focus states, ARIA labels)

## Testing and Quality Assurance

### Responsive Testing:
- Test at 320px, 768px, 1024px, and 1440px widths
- Verify touch targets are 44px minimum
- Ensure text remains readable at all sizes

### Accessibility Testing:
- Keyboard navigation works properly
- Focus states are visible and consistent
- Screen reader compatibility maintained
- Color contrast meets WCAG AA standards

## Performance Benefits

- **Reduced bundle size** through component consolidation
- **Fewer HTTP requests** with unified imports
- **Better tree shaking** with modular design tokens
- **Consistent caching** of shared styles

## Future Enhancements

### Planned Additions:
- **ArticleCard** component for article listings
- **SectionHeader** component for content areas  
- **NavigationMenu** unified component
- **FormField** standardized form inputs

### Storybook Integration:
- Component documentation and examples
- Interactive prop testing
- Visual regression testing
- Design system showcase

## Commit Summary

This refactor delivers:

✅ **Centralized design tokens** in `components/ui/design-tokens.ts`  
✅ **Unified card system** replacing 3 duplicate components  
✅ **Consistent sidebar widgets** with standardized styling  
✅ **Mobile-first responsiveness** across all components  
✅ **Backward compatibility** through wrapper components  
✅ **Optimized imports** and reduced code duplication  
✅ **Comprehensive documentation** for future scaling  

**Result:** Maintainable, scalable UI system with zero breaking changes and improved developer experience.
