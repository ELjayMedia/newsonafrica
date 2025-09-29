/**
 * Grid Components
 * Responsive grid components for consistent layouts
 */

import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

// Container Component
interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  centered?: boolean
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "xl", centered = true, ...props }, ref) => {
    const sizeClasses = {
      sm: "max-w-screen-sm",
      md: "max-w-screen-md",
      lg: "max-w-screen-lg",
      xl: "max-w-screen-xl",
      "2xl": "max-w-screen-2xl",
      full: "max-w-full",
    }

    return (
      <div
        ref={ref}
        className={cn("w-full px-4 sm:px-6 lg:px-8", centered && "mx-auto", sizeClasses[size], className)}
        {...props}
      />
    )
  },
)
Container.displayName = "Container"

// Grid Component
interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12 | "auto-fit-xs" | "auto-fit-sm" | "auto-fit-md" | "auto-fit-lg"
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12
  responsive?: boolean
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 1, gap = 4, responsive = true, ...props }, ref) => {
    const getColsClass = () => {
      if (typeof cols === "string") {
        return `grid-cols-${cols}`
      }

      if (responsive) {
        switch (cols) {
          case 2:
            return "grid-cols-1 md:grid-cols-2"
          case 3:
            return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          case 4:
            return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          case 5:
            return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          case 6:
            return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          case 12:
            return "grid-cols-1 md:grid-cols-6 lg:grid-cols-12"
          default:
            return `grid-cols-${cols}`
        }
      }

      return `grid-cols-${cols}`
    }

    return <div ref={ref} className={cn("grid", getColsClass(), `gap-${gap}`, className)} {...props} />
  },
)
Grid.displayName = "Grid"

// Flex Component
interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "col" | "row-reverse" | "col-reverse"
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly"
  wrap?: boolean
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12
}

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  ({ className, direction = "row", align = "start", justify = "start", wrap = false, gap, ...props }, ref) => {
    const directionClass = `flex-${direction}`
    const alignClass =
      align === "start"
        ? "items-start"
        : align === "center"
          ? "items-center"
          : align === "end"
            ? "items-end"
            : align === "stretch"
              ? "items-stretch"
              : "items-baseline"
    const justifyClass =
      justify === "start"
        ? "justify-start"
        : justify === "center"
          ? "justify-center"
          : justify === "end"
            ? "justify-end"
            : justify === "between"
              ? "justify-between"
              : justify === "around"
                ? "justify-around"
                : "justify-evenly"

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          directionClass,
          alignClass,
          justifyClass,
          wrap && "flex-wrap",
          gap && `gap-${gap}`,
          className,
        )}
        {...props}
      />
    )
  },
)
Flex.displayName = "Flex"

// News-specific Grid Components
export const NewsGrid = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6", className)}
    {...props}
  />
))
NewsGrid.displayName = "NewsGrid"

export const NewsHeroGrid = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)} {...props} />
  ),
)
NewsHeroGrid.displayName = "NewsHeroGrid"

export const NewsSidebarLayout = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8", className)} {...props} />
  ),
)
NewsSidebarLayout.displayName = "NewsSidebarLayout"

// Section Component for consistent spacing
interface SectionProps extends HTMLAttributes<HTMLElement> {
  size?: "sm" | "default" | "lg"
  as?: "section" | "div" | "article" | "aside"
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ className, size = "default", as: Component = "section", ...props }, ref) => {
    const sizeClasses = {
      sm: "py-8 md:py-12",
      default: "py-12 md:py-16 lg:py-20",
      lg: "py-16 md:py-20 lg:py-24",
    }

    return <Component ref={ref} className={cn(sizeClasses[size], className)} {...props} />
  },
)
Section.displayName = "Section"

// Stack Component for vertical spacing
interface StackProps extends HTMLAttributes<HTMLDivElement> {
  space?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12
  align?: "start" | "center" | "end" | "stretch"
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ className, space = 4, align = "stretch", ...props }, ref) => {
    const alignClass =
      align === "start"
        ? "items-start"
        : align === "center"
          ? "items-center"
          : align === "end"
            ? "items-end"
            : "items-stretch"

    return <div ref={ref} className={cn("flex flex-col", alignClass, `space-y-${space}`, className)} {...props} />
  },
)
Stack.displayName = "Stack"
