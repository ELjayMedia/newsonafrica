import type React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-muted/80", className)}
      {...props}
      aria-hidden="true"
    />
  )
}
