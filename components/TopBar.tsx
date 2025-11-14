"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookmarkIcon, LogIn } from "lucide-react"

import { ProfileDropdown } from "@/components/ProfileDropdown"
import { Button } from "@/components/ui/button"
import { Flex } from "@/components/ui/grid"
import { TypographySmall } from "@/components/ui/typography"
import { useAuth } from "@/hooks/useAuth"

export function TopBar() {
  const { user, profile, loading } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)
  const pathname = usePathname()

  // Show welcome message for 5 seconds after login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const justLoggedIn = params.get("loggedIn") === "true"

    if (justLoggedIn && user) {
      setShowWelcome(true)

      const newUrl =
        window.location.pathname +
        (window.location.search ? window.location.search.replace("loggedIn=true", "").replace(/(\?|&)$/, "") : "")
      window.history.replaceState({}, "", newUrl)

      const timer = setTimeout(() => {
        setShowWelcome(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [user, pathname])

  return (
    <div className="hidden bg-foreground text-background md:block">
      <div className="mx-auto w-full max-w-[980px] px-4 py-2 md:px-6">
        <Flex justify="between" align="center" className="gap-4" wrap>
          <TypographySmall className="font-medium text-background/80">
            {showWelcome && user ? (
              <span>
                Welcome back, {profile?.full_name || profile?.username || user.email?.split("@")[0]}!
              </span>
            ) : (
              <span>
                <span className="hidden sm:inline">Stay informed. </span>
                Subscribe for full access.
              </span>
            )}
          </TypographySmall>
          <Flex align="center" className="gap-3" wrap>
            {loading ? (
              <div className="h-9 w-28 rounded-full bg-background/20" />
            ) : (
              <>
                <Button asChild variant="success" size="sm" className="rounded-full px-5 font-semibold text-success-foreground">
                  <Link href="/subscribe">Subscribe</Link>
                </Button>
                {user ? (
                  <Flex align="center" className="gap-2">
                    <Button asChild variant="ghost" size="icon-sm" className="text-background hover:bg-background/15">
                      <Link href="/bookmarks">
                        <BookmarkIcon className="h-4 w-4" />
                        <span className="sr-only">Bookmarks</span>
                      </Link>
                    </Button>
                    <ProfileDropdown />
                  </Flex>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="gap-2 rounded-full text-background hover:bg-background/15"
                  >
                    <Link href="/auth?tab=signin">
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </Link>
                  </Button>
                )}
              </>
            )}
          </Flex>
        </Flex>
      </div>
    </div>
  )
}
