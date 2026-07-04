import * as React from "react";

import { cn } from "@/lib/utils";

/** Loading placeholder. Pair with explicit width/height utility classes. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
