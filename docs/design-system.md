# Design System

This document describes the foundation of the News on Africa UI design system.

## Tokens

All colors, spacing, radii and typography values are exposed as CSS variables in `src/styles/tokens.css`.  These tokens power Tailwind utilities so components stay consistent across themes.

Tokens are defined for light, dark and high‑contrast themes and are consumed via `hsl(var(--token))` in Tailwind.

## Components

Base UI components derive from [shadcn/ui](https://ui.shadcn.com) and the Radix primitives. They inherit token values through Tailwind classes and CSS variables.

## Accessibility

- Maintain WCAG AA contrast by leveraging the color tokens.
- Provide keyboard focus styles and skip links so users can bypass navigation.
- Use the `VisuallyHidden` helper when content must be available to screen readers only.

## Motion

Subtle motion patterns can be reused through helpers in `src/ui/motion.tsx`. Prefer reduced motion for users that opt out of animation.

## Typography

Article content uses the `prose` styles in `src/styles/prose.css` to enforce readable line length, heading hierarchy, lists, blockquotes and captions.

## Theming

Themes are toggled by setting `data-theme="light" | "dark" | "hc"` on the `<html>` element. The selection persists in `localStorage` and updates CSS variables at runtime.
