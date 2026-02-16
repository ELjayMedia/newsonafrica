"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { BookmarkIcon, LogIn } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export function TopBar() {
  const { user, profile, loading } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const authSignInHref = useMemo(() => {
    const path = pathname || "/"
    const query = searchParams?.toString()
    const destination = query ? `${path}?${query}` : path
    const params = new URLSearchParams()
    params.set("tab", "signin")
    params.set("redirectTo", destination.startsWith("/") ? destination : "/")
    return `/auth?${params.toString()}`
  }, [pathname, searchParams])

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
            <div className="h-8 w-24 bg-gray-700 rounded-full"></div>
          ) : (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="bg-green-500 text-black border-green-500 hover:bg-green-600 hover:text-black hover:border-green-600 rounded-full no-underline"
              >
                <Link href="/subscribe">Subscribe</Link>
              </Button>

              {user ? (
                <div className="flex items-center space-x-2">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8 text-white hover:bg-white/20"
                  >
                    <Link href="/bookmarks">
                      <BookmarkIcon className="h-4 w-4" />
                      <span className="sr-only">Bookmarks</span>
                    </Link>
                  </Button>

                  <ProfileDropdown />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 rounded-full flex items-center gap-1.5 no-underline"
                  >
                    <Link href={authSignInHref}>
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
