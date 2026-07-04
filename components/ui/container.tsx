import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Centered, max-width page container with responsive horizontal padding.
 * Use as the standard horizontal gutter for page sections on the news site.
 */
const Container = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  ),
);
Container.displayName = "Container";

export { Container };
