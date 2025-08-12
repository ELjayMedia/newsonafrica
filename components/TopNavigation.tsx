"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Search, Menu, User, BellRing } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { navConfig } from "@/config/nav"

export function TopNavigation() {
  const [isDark, setIsDark] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  // Check for user's theme preference
  useEffect(() => {
    const isDarkMode =
      localStorage.getItem("theme") === "dark" ||
      (localStorage.getItem("theme") === null && window.matchMedia("(prefers-color-scheme: dark)").matches)

    setIsDark(isDarkMode)

    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    if (isDark) {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    } else {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
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

  const handleNotifications = () => {
    router.push("/notifications")
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
            <Link href="/" className="text-2xl font-bold">
              News On Africa
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSearch} aria-label="Search">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNotifications} aria-label="Notifications">
              <BellRing className="h-5 w-5" />
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
            {navConfig.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="block py-2 hover:text-blue-600 dark:hover:text-blue-400"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
