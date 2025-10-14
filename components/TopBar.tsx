"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { BookmarkIcon, LogIn } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function TopBar() {
  const { user, profile, loading } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)
  const pathname = usePathname()

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

  const subscribeButtonBaseClasses =
    "bg-green-500 text-black border-green-500 hover:bg-green-600 hover:text-black hover:border-green-600 rounded-full"
  const bookmarkButtonBaseClasses = "rounded-full h-8 w-8 text-white hover:bg-white/20"
  const signInButtonBaseClasses = "text-white hover:bg-white/20 rounded-full flex items-center gap-1.5"

  const renderSubscribeButton = (extraClasses = "") => (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={
        extraClasses ? `${subscribeButtonBaseClasses} ${extraClasses}` : subscribeButtonBaseClasses
      }
    >
      <Link href="/subscribe" className="no-underline">
        Subscribe
      </Link>
    </Button>
  )

  const renderBookmarksButton = (extraClasses = "", iconClass = "h-4 w-4") => (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className={
        extraClasses ? `${bookmarkButtonBaseClasses} ${extraClasses}` : bookmarkButtonBaseClasses
      }
    >
      <Link href="/bookmarks">
        <BookmarkIcon className={iconClass} />
        <span className="sr-only">Bookmarks</span>
      </Link>
    </Button>
  )

  const renderSignInButton = (extraClasses = "") => (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={
        extraClasses ? `${signInButtonBaseClasses} ${extraClasses}` : signInButtonBaseClasses
      }
    >
      <Link href="/auth?tab=signin" className="no-underline">
        <LogIn className="h-4 w-4" />
        <span>Sign In</span>
      </Link>
    </Button>
  )

  const welcomeMessage =
    showWelcome && user ? (
      <span className="text-green-400 font-medium">
        Welcome back, {profile?.full_name || profile?.username || user.email?.split("@")[0]}!
      </span>
    ) : (
      <span>
        <span className="hidden sm:inline">Stay informed. </span>
        Subscribe for full access.
      </span>
    )

  return (
    <div className="bg-black text-white">
      <div className="mx-auto hidden max-w-[980px] items-center justify-between px-4 py-2 md:flex">
        <div className="text-sm">{welcomeMessage}</div>
        <div className="flex items-center space-x-3">
          {loading ? (
            <div className="h-8 w-24 rounded-full bg-gray-700 animate-pulse" />
          ) : (
            <>
              {renderSubscribeButton()}
              {user ? (
                <div className="flex items-center space-x-2">
                  {renderBookmarksButton()}
                  <ProfileDropdown />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {renderSignInButton()}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-[980px] items-center justify-between px-4 py-2 md:hidden">
        <SidebarTrigger className="md:hidden h-9 w-9 text-white hover:bg-white/20" />
        <div className="flex flex-1 items-center justify-center px-2 text-center text-xs font-medium">
          {welcomeMessage}
        </div>
        <div className="flex items-center gap-1.5">
          {loading ? (
            <div className="h-8 w-16 rounded-full bg-gray-700 animate-pulse" />
          ) : (
            <>
              {renderSubscribeButton("px-3 text-xs font-semibold")}
              {user ? (
                <div className="flex items-center gap-1.5">
                  {renderBookmarksButton("h-9 w-9", "h-4 w-4")}
                  <ProfileDropdown />
                </div>
              ) : (
                renderSignInButton("px-3 text-xs font-semibold")
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
