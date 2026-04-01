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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
          {/* Main content */}
          <div className="lg:border-r lg:border-border lg:pr-8">{children}</div>

          {/* Sidebar - sticky on desktop */}
          {sidebar && (
            <aside>
              <div className="sticky top-0 space-y-6">{sidebar}</div>
            </aside>
          )}
        </div>
      </div>
    </article>
  )
}
