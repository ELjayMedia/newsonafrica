import type React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  // Add animation variant options
  animation?: "pulse" | "shimmer" | "none"
  // Add optional delay to stagger animations
  delay?: number
}

export function Skeleton({ className, animation = "pulse", delay = 0, ...props }: SkeletonProps) {
  // Define animation classes based on the animation prop
  const animationClass = {
    pulse: "animate-pulse",
    shimmer:
      "animate-shimmer before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
    none: "",
  }[animation]

  // Apply delay if specified
  const delayStyle = delay ? { animationDelay: `${delay}ms` } : {}

  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-muted/80", animationClass, className)}
      style={delayStyle}
      {...props}
      aria-hidden="true"
    />
  )
}
