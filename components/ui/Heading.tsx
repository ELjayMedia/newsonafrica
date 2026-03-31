/**
 * Heading Component
 * Unified semantic heading with consistent typography and sizing
 */

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

const headingVariants = cva("text-foreground text-balance", {
  variants: {
    level: {
      h1: "heading-lg md:display-lg font-bold tracking-tight",
      h2: "heading-md md:heading-lg font-semibold tracking-tight",
      h3: "heading-sm md:heading-md font-semibold",
      h4: "text-heading-sm font-semibold",
      h5: "text-base md:text-heading-sm font-medium",
      h6: "text-sm md:text-base font-medium",
    },
    weight: {
      bold: "font-bold",
      semibold: "font-semibold",
      medium: "font-medium",
    },
  },
  defaultVariants: {
    level: "h2",
    weight: "semibold",
  },
})

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  asChild?: boolean
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = "h2", weight, ...props }, ref) => {
    const Comp = (level || "h2") as React.ElementType
    // Determine weight based on level if not explicitly set
    const finalWeight = weight || (level === "h1" ? "bold" : "semibold")

    return (
      <Comp
        className={cn(headingVariants({ level, weight: finalWeight }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)

Heading.displayName = "Heading"

export { Heading, headingVariants }
