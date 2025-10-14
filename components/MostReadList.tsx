import Link from "next/link"
import { Clock, TrendingUp } from "lucide-react"
import { SidebarSectionCard, SidebarSectionHeader } from "./sidebarShared"
import { DEFAULT_RANK_GRADIENT, MOST_READ_RANK_GRADIENTS } from "./sidebarConstants"
import { cn } from "@/lib/utils"

export interface MostReadListItem {
  id: string
  title: string
  href: string
  date?: string | null
}

interface MostReadListProps {
  posts: MostReadListItem[]
}

export function MostReadList({ posts }: MostReadListProps) {
  return (
    <SidebarSectionCard className="p-5 transition-all hover:shadow-md">
      <SidebarSectionHeader
        icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
        title="Most Read"
      />
      <div className="space-y-4">
        {posts.map((post, index) => {
          const gradient = MOST_READ_RANK_GRADIENTS[index] ?? DEFAULT_RANK_GRADIENT
          const isTopThree = index < MOST_READ_RANK_GRADIENTS.length

          return (
            <Link
              key={post.id}
              href={post.href}
              className="flex items-start gap-3 group transition-all hover:bg-gray-50 p-2.5 -mx-2.5 rounded-lg"
            >
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center shadow-sm",
                  gradient,
                  isTopThree && "ring-2 ring-offset-1 ring-gray-200",
                )}
              >
                <span
                  className={cn("text-sm font-bold", isTopThree ? "text-white" : "text-gray-600")}
                  aria-label={`Rank ${index + 1}`}
                >
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold leading-snug group-hover:text-blue-600 transition-colors line-clamp-3 mb-1">
                  {post.title}
                </h3>
                {post.date && (
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <time dateTime={post.date} className="truncate">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">Updated every 3 minutes</p>
      </div>
    </SidebarSectionCard>
  )
}
