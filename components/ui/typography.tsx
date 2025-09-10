/**
 * Typography Components
 * Semantic typography components with consistent styling
 */

import type React from "react"
import { cn } from "@/lib/utils"
import { typographyScale } from "@/lib/typography"
import type { JSX } from "react/jsx-runtime" // Declare JSX variable

// Base Typography Component Props
interface TypographyProps {
  children: React.ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
}

// Display Components
export function TypographyDisplayXL({ children, className, as: Component = "h1" }: TypographyProps) {
  return (
    <Component
      className={cn(
        "font-extrabold tracking-tight text-balance",
        "text-5xl sm:text-6xl lg:text-7xl",
        "leading-none",
        className,
      )}
      style={typographyScale.display.xl}
    >
      {children}
    </Component>
  )
}

export function TypographyDisplayLG({ children, className, as: Component = "h1" }: TypographyProps) {
  return (
    <Component
      className={cn(
        "font-bold tracking-tight text-balance",
        "text-4xl sm:text-5xl lg:text-6xl",
        "leading-tight",
        className,
      )}
      style={typographyScale.display.lg}
    >
      {children}
    </Component>
  )
}

// Heading Components
export function TypographyH1({ children, className, as: Component = "h1" }: TypographyProps) {
  return (
    <Component
      className={cn("font-bold tracking-tight text-balance", "text-3xl sm:text-4xl", "leading-tight", className)}
      style={typographyScale.heading.h1}
    >
      {children}
    </Component>
  )
}

export function TypographyH2({ children, className, as: Component = "h2" }: TypographyProps) {
  return (
    <Component
      className={cn("font-semibold tracking-tight text-balance", "text-2xl sm:text-3xl", "leading-tight", className)}
      style={typographyScale.heading.h2}
    >
      {children}
    </Component>
  )
}

export function TypographyH3({ children, className, as: Component = "h3" }: TypographyProps) {
  return (
    <Component
      className={cn("font-semibold text-balance", "text-xl sm:text-2xl", "leading-snug", className)}
      style={typographyScale.heading.h3}
    >
      {children}
    </Component>
  )
}

export function TypographyH4({ children, className, as: Component = "h4" }: TypographyProps) {
  return (
    <Component
      className={cn("font-semibold text-balance", "text-lg sm:text-xl", "leading-snug", className)}
      style={typographyScale.heading.h4}
    >
      {children}
    </Component>
  )
}

// Body Text Components
export function TypographyLead({ children, className, as: Component = "p" }: TypographyProps) {
  return (
    <Component
      className={cn("text-muted-foreground text-pretty", "text-lg sm:text-xl", "leading-relaxed", className)}
      style={typographyScale.special.lead}
    >
      {children}
    </Component>
  )
}

export function TypographyP({ children, className, as: Component = "p" }: TypographyProps) {
  return (
    <Component className={cn("text-pretty leading-relaxed", "text-base", className)} style={typographyScale.body.base}>
      {children}
    </Component>
  )
}

export function TypographyLarge({ children, className, as: Component = "div" }: TypographyProps) {
  return (
    <Component className={cn("text-pretty leading-relaxed", "text-lg", className)} style={typographyScale.body.lg}>
      {children}
    </Component>
  )
}

export function TypographySmall({ children, className, as: Component = "small" }: TypographyProps) {
  return (
    <Component className={cn("leading-normal", "text-sm", className)} style={typographyScale.body.sm}>
      {children}
    </Component>
  )
}

// Special Components
export function TypographyMuted({ children, className, as: Component = "p" }: TypographyProps) {
  return (
    <Component
      className={cn("text-muted-foreground text-pretty", "text-sm", "leading-normal", className)}
      style={typographyScale.special.caption}
    >
      {children}
    </Component>
  )
}

export function TypographyCode({ children, className, as: Component = "code" }: TypographyProps) {
  return (
    <Component
      className={cn("relative rounded bg-muted px-[0.3rem] py-[0.2rem]", "font-mono text-sm font-semibold", className)}
    >
      {children}
    </Component>
  )
}

export function TypographyBlockquote({ children, className, as: Component = "blockquote" }: TypographyProps) {
  return (
    <Component className={cn("mt-6 border-l-2 pl-6 italic", "text-pretty leading-relaxed", className)}>
      {children}
    </Component>
  )
}

// List Components
export function TypographyList({ children, className, as: Component = "ul" }: TypographyProps) {
  return <Component className={cn("my-6 ml-6 list-disc", "[&>li]:mt-2", className)}>{children}</Component>
}

export function TypographyInlineCode({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={cn("relative rounded bg-muted px-[0.3rem] py-[0.2rem]", "font-mono text-sm", className)}>
      {children}
    </code>
  )
}
