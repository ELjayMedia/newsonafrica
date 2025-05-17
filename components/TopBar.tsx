"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Bell, BookmarkIcon } from "lucide-react"
import { NotificationBadge } from "@/components/NotificationBadge"
import { useAuthModal } from "@/hooks/useAuthModal"
import { useAuth } from "@/hooks/useAuth"

export function TopBar() {
  const { user, profile, loading } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)
  const pathname = usePathname()
  const { open: openAuthModal } = useAuthModal()

  // Show welcome message for 5 seconds after login
  useEffect(() => {
    // Check if we just logged in (via URL parameter)
    const params = new URLSearchParams(window.location.search)
    const justLoggedIn = params.get("loggedIn") === "true"

    if (justLoggedIn && user) {
      setShowWelcome(true)

      // Remove the query parameter without page reload
      const newUrl =
        window.location.pathname +
        (window.location.search ? window.location.search.replace("loggedIn=true", "").replace(/(\?|&)$/, "") : "")
      window.history.replaceState({}, "", newUrl)

      // Hide welcome message after 5 seconds
      const timer = setTimeout(() => {
        setShowWelcome(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [user, pathname])

  return (
    <div className="bg-black text-white hidden md:block">
      <div className="mx-auto max-w-[980px] px-4 py-2 flex justify-between items-center">
        <div className="text-sm">
          {showWelcome && user ? (
            <span className="text-green-400 font-medium">
              Welcome back, {profile?.full_name || profile?.username || user.email?.split("@")[0]}!
            </span>
          ) : (
            <span>
              <span className="hidden sm:inline">Stay informed. </span>
              Subscribe for full access.
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {loading ? (
            <div className="h-8 w-24 bg-gray-700 animate-pulse rounded-full"></div>
          ) : (
            <>
              <Button variant="outline" size="sm" className="text-white border-white hover:bg-white/10 rounded-full">
                <Link href="/subscribe" className="no-underline">
                  Subscribe
                </Link>
              </Button>

              {user ? (
                <div className="flex items-center space-x-2">
                  <Link href="/bookmarks">
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-white hover:bg-white/20">
                      <BookmarkIcon className="h-4 w-4" />
                      <span className="sr-only">Bookmarks</span>
                    </Button>
                  </Link>

                  <Link href="/notifications">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8 text-white hover:bg-white/20 relative"
                    >
                      <Bell className="h-4 w-4" />
                      <NotificationBadge />
                      <span className="sr-only">Notifications</span>
                    </Button>
                  </Link>

                  <ProfileDropdown />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-full"
                  onClick={() => openAuthModal({ defaultTab: "signin" })}
                >
                  Sign In
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
