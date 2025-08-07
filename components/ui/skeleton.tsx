import type React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  animation?: "pulse" | "shimmer" | "none"
  delay?: number
}

function Skeleton({
  className,
  animation = "pulse",
  delay = 0,
  ...props
}: SkeletonProps) {
  const animationClass = {
    pulse: "animate-pulse",
    shimmer:
      "animate-shimmer before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
    none: "",
  }[animation]

  const delayStyle = delay ? { animationDelay: `${delay}ms` } : {}

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        animationClass,
        className,
      )}
      style={delayStyle}
      aria-hidden="true"
      {...props}
    />
  )
}

export { Skeleton }
