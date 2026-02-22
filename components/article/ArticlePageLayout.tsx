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
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-12 lg:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
          {/* Main content */}
          <div className="lg:col-span-2">{children}</div>

          {/* Sidebar - sticky on desktop */}
          {sidebar && (
            <aside className="lg:col-span-1">
              <div className="sticky top-8 space-y-8">{sidebar}</div>
            </aside>
          )}
        </div>
      </div>
    </article>
  )
}
