import Image from "next/image"
import Link from "next/link"
import { Clock } from "lucide-react"
import { SidebarSectionCard, SidebarSectionHeader } from "./sidebarShared"

export interface PersonalizedListItem {
  id: string
  title: string
  href: string
  date?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
}

interface PersonalizedListProps {
  posts: PersonalizedListItem[]
  title: string
}

export function PersonalizedList({ posts, title }: PersonalizedListProps) {
  return (
    <SidebarSectionCard className="p-5 transition-all hover:shadow-md">
      <SidebarSectionHeader title={title} />
      <div className="space-y-4">
        {posts.slice(0, 5).map((post) => (
          <Link
            key={post.id}
            href={post.href}
            className="flex items-start gap-3 group transition-all hover:bg-gray-50 p-2.5 -mx-2.5 rounded-lg"
          >
            {post.imageUrl && (
              <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                <Image
                  src={post.imageUrl || "/placeholder.svg"}
                  alt={post.imageAlt || post.title}
                  fill
                  sizes="80px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-1.5">
                {post.title}
              </h3>
              {post.date && (
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <time dateTime={post.date} className="truncate">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </SidebarSectionCard>
  )
}
