import type React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  animation?: "pulse" | "shimmer" | "none"
  delay?: number
}

export function Skeleton({ className, animation = "pulse", delay = 0, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/80",
        animation === "pulse" && "animate-pulse",
        animation === "shimmer" && "animate-pulse",
        className,
      )}
      style={{ ...style, animationDelay: `${delay}ms` }}
      {...props}
      aria-hidden="true"
    />
  )
}
