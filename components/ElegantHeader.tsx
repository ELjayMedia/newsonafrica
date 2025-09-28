"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { BookmarkIcon, LogIn, Menu, Search } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

export function ElegantHeader() {
  const { user, profile, loading } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  // Show welcome message for 5 seconds after login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const justLoggedIn = params.get("loggedIn") === "true"

    if (justLoggedIn && user) {
      setShowWelcome(true)

      const newUrl =
        window.location.pathname +
        (window.location.search ? window.location.search.replace("loggedIn=true", "").replace(/(\\?|&)$/, "") : "")
      window.history.replaceState({}, "", newUrl)

      const timer = setTimeout(() => {
        setShowWelcome(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [user, pathname])

  const categories = [
    { name: "News", href: "/news" },
    { name: "Politics", href: "/politics" },
    { name: "Business", href: "/business" },
    { name: "Sports", href: "/sports" },
    { name: "Entertainment", href: "/entertainment" },
    { name: "Opinion", href: "/opinion" },
  ]

  return (
    <header className="bg-background border-b border-border/50">
      {/* Top Bar */}
      <div className="bg-earth-dark text-earth-dark-foreground">
        <div className="mx-auto max-w-7xl px-4 py-2 flex justify-between items-center text-sm">
          <div>
            {showWelcome && user ? (
              <span className="text-success font-medium">
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
              <div className="h-8 w-24 bg-earth-light animate-pulse rounded-full"></div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-success text-success-foreground border-success hover:bg-success-light hover:border-success-light rounded-full"
                >
                  <Link href="/subscribe" className="no-underline">
                    Subscribe
                  </Link>
                </Button>

                {user ? (
                  <div className="flex items-center space-x-2">
                    <Link href="/bookmarks">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 text-earth-dark-foreground hover:bg-earth-light/20"
                      >
                        <BookmarkIcon className="h-4 w-4" />
                        <span className="sr-only">Bookmarks</span>
                      </Button>
                    </Link>
                    <ProfileDropdown />
                  </div>
                ) : (
                  <Link href="/auth?tab=signin" className="no-underline">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-earth-dark-foreground hover:bg-earth-light/20 rounded-full flex items-center gap-1.5"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-earth-warm hover:text-earth-dark transition-colors"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">menu</span>
          </button>

          {/* Logo */}
          <div className="flex-1 md:flex-none text-center md:text-left">
            <Link href="/" className="inline-block">
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-earth-dark">News On Africa</h1>
              <p className="text-sm text-muted-foreground mt-1 hidden md:block">Where the Continent Connects</p>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="text-sm font-medium text-foreground hover:text-earth-warm transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          {/* Search Button */}
          <Button variant="ghost" size="icon" className="text-earth-warm hover:text-earth-dark">
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={category.href}
                  className="text-sm font-medium text-foreground hover:text-earth-warm transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
