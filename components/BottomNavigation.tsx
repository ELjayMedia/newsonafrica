"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Bookmark, User } from "lucide-react"
import { useUser } from "@/contexts/UserContext"

export function BottomNavigation() {
  const pathname = usePathname()
  const { user } = useUser()

  // Define navigation items, but we'll modify the Profile link based on auth state
  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Search", href: "/search", icon: Search },
    { name: "Bookmarks", href: "/bookmarks", icon: Bookmark },
    // Profile link will lead to profile page if logged in, otherwise to auth page
    {
      name: "Profile",
      href: user ? "/profile" : "/auth?redirectTo=/profile",
      icon: User,
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="mx-auto max-w-[980px]">
        <ul className="flex justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center pt-2 pb-1 ${isActive ? "text-blue-600" : "text-gray-600"}`}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs mt-1">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
