import { ReactNode } from "react"
import { Card } from "./ui/card"
import { cn } from "@/lib/utils"

interface PostCardProps {
  image?: ReactNode
  title: ReactNode
  excerpt?: ReactNode
  meta?: ReactNode
  className?: string
  imageClassName?: string
  contentClassName?: string
}

export function PostCard({
  image,
  title,
  excerpt,
  meta,
  className = "",
  imageClassName = "",
  contentClassName = "",
}: PostCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {image && <div className={cn(imageClassName)}>{image}</div>}
      <div className={cn("flex flex-col", contentClassName)}>
        {typeof title === "string" ? (
          <h3 className="font-bold text-sm md:text-base mb-2 line-clamp-2">{title}</h3>
        ) : (
          title
        )}
        {excerpt && (
          <div className="text-sm text-muted-foreground mb-2 line-clamp-3">
            {excerpt}
          </div>
        )}
        {meta && <div className="mt-auto">{meta}</div>}
      </div>
    </Card>
  )
}
