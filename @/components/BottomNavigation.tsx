"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Compass, Bookmark, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useClientMediaQuery } from "@/hooks/use-client-media-query"

export function BottomNavigation() {
  const pathname = usePathname()
  const isMobile = useClientMediaQuery("(max-width: 768px)")

  if (!isMobile) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 py-2">
      <div className="flex justify-around items-center">
        <NavItem href="/" icon={<Home size={24} />} label="Home" isActive={pathname === "/"} />
        <NavItem href="/search" icon={<Search size={24} />} label="Search" isActive={pathname === "/search"} />
        <NavItem href="/discover" icon={<Compass size={24} />} label="Discover" isActive={pathname === "/discover"} />
        <NavItem
          href="/bookmarks"
          icon={<Bookmark size={24} />}
          label="Bookmarks"
          isActive={pathname === "/bookmarks"}
        />
        <NavItem href="/profile" icon={<User size={24} />} label="Profile" isActive={pathname === "/profile"} />
      </div>
    </div>
  )
}

function NavItem({
  href,
  icon,
  label,
  isActive,
}: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center">
      <div className={cn("p-1", isActive ? "text-blue-600" : "text-gray-500")}>{icon}</div>
      <span className={cn("text-xs", isActive ? "text-blue-600" : "text-gray-500")}>{label}</span>
    </Link>
  )
}
