import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ArticlePageLayoutProps {
  children: ReactNode
  className?: string
}

export function ArticlePageLayout({ children, className }: ArticlePageLayoutProps) {
  return (
    <article className={cn("min-h-screen bg-background", className)}>
      <div className="mx-auto w-full max-w-screen-xl py-6">
        <div className="w-full">
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </article>
  )
}
