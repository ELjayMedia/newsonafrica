import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ArticlePageLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
  className?: string
}

export function ArticlePageLayout({ children, sidebar, className }: ArticlePageLayoutProps) {
  return (
    <article className={cn("min-h-screen bg-background", className)}>
      <div className="mx-auto w-full max-w-screen-xl py-6">
        <div className={cn("w-full", sidebar && "lg:grid lg:grid-cols-[1fr_320px] lg:gap-8")}>
          <div className="min-w-0">{children}</div>
          {sidebar && (
            <aside className="hidden lg:block">
              <div className="sticky top-6">{sidebar}</div>
            </aside>
          )}
        </div>
      </div>
    </article>
  )
}
