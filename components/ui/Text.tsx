/**
 * Text Component
 * Unified semantic text with consistent typography and sizes
 */

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

const textVariants = cva("text-foreground", {
  variants: {
    size: {
      xs: "text-ui-sm leading-normal",
      sm: "text-body-sm leading-relaxed",
      base: "text-body-lg leading-relaxed",
      lg: "text-lg md:text-xl leading-relaxed",
      xl: "text-xl md:text-2xl leading-relaxed",
    },
    weight: {
      light: "font-light",
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    color: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      subtle: "text-muted-foreground/70",
      primary: "text-primary",
      destructive: "text-destructive",
      secondary: "text-secondary-foreground",
    },
  },
  defaultVariants: {
    size: "base",
    weight: "normal",
    color: "default",
  },
})

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  asChild?: boolean
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  (
    { className, size = "base", weight = "normal", color = "default", ...props },
    ref
  ) => (
    <p
      className={cn(textVariants({ size, weight, color }), className)}
      ref={ref}
      {...props}
    />
  )
)

Text.displayName = "Text"

export { Text, textVariants }
