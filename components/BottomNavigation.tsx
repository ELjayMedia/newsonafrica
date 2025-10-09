"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Bookmark, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { getHomeHref } from "@/lib/utils/routing"

export function BottomNavigation() {
  const pathname = usePathname()
  const { user, profile, loading } = useAuth()
  const homeHref = getHomeHref(pathname)

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part?.[0] || "")
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const displayName = profile?.full_name || profile?.username || user?.email?.split("@")[0] || ""

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 py-2 px-3 md:hidden">
      <div className="flex justify-around items-center">
        <Link href={homeHref} className="flex flex-col items-center">
          <div className={cn("p-1 rounded-full", pathname === homeHref ? "text-blue-600" : "text-gray-500")}>
            <Home size={20} />
          </div>
          <span className="text-xs mt-1">Home</span>
        </Link>

        <Link href="/search" className="flex flex-col items-center">
          <div className={cn("p-1 rounded-full", pathname === "/search" ? "text-blue-600" : "text-gray-500")}>
            <Search size={20} />
          </div>
          <span className="text-xs mt-1">Search</span>
        </Link>

        <Link href="/bookmarks" className="flex flex-col items-center">
          <div className={cn("p-1 rounded-full", pathname === "/bookmarks" ? "text-blue-600" : "text-gray-500")}>
            <Bookmark size={20} />
          </div>
          <span className="text-xs mt-1">Bookmarks</span>
        </Link>

        <Link href={user ? "/profile" : "/auth"} className="flex flex-col items-center">
          <div
            className={cn(
              "flex items-center justify-center",
              pathname === "/profile" || pathname === "/auth" ? "text-blue-600" : "text-gray-500",
            )}
          >
            {user && !loading ? (
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-xs bg-blue-600 text-white">
                  {displayName ? getInitials(displayName) : "U"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User size={20} />
            )}
          </div>
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </div>
  )
}
