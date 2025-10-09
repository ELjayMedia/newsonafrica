"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Search, Menu, User } from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getCategoryUrl, getHomeHref } from "@/lib/utils/routing"
import { useUserPreferences, type ThemePreference } from "@/contexts/UserPreferencesContext"

export function TopNavigation() {
  const [isDark, setIsDark] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const homeHref = getHomeHref(pathname)
  const { preferences, setTheme, updating } = useUserPreferences()

  useEffect(() => {
    const resolvedTheme = preferences.theme
    if (resolvedTheme === "system") {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setIsDark(systemPrefersDark)
      return
    }

    setIsDark(resolvedTheme === "dark")
  }, [preferences.theme])

  const toggleTheme = async () => {
    const nextTheme = isDark ? "light" : "dark"
    setIsDark(!isDark)
    try {
      await setTheme(nextTheme as ThemePreference)
    } catch (error) {
      console.error("Failed to update theme preference:", error)
    }
  }

  const handleSearch = () => {
    router.push("/search")
    setIsMenuOpen(false)
  }

  const handleProfile = () => {
    router.push("/profile")
    setIsMenuOpen(false)
  }

  return (
    <header className="border-b bg-white dark:bg-gray-800 sticky top-0 z-30">
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href={homeHref} className="text-2xl font-bold">
              News On Africa
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              disabled={updating}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSearch} aria-label="Search">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleProfile} aria-label="User profile">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <nav className="space-y-2">
            <Link
              href={getCategoryUrl("news") as string}
              className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => setIsMenuOpen(false)}
            >
              News
            </Link>
            <Link
              href={getCategoryUrl("business") as string}
              className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => setIsMenuOpen(false)}
            >
              Business
            </Link>
            <Link
              href={getCategoryUrl("sport") as string}
              className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => setIsMenuOpen(false)}
            >
              Sport
            </Link>
            <Link
              href={getCategoryUrl("entertainment") as string}
              className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => setIsMenuOpen(false)}
            >
              Entertainment
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
