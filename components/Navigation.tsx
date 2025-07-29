"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthProvider"
import { Button } from "@/components/ui/button"
import { Home, Search, Grid, Bookmark, User, Menu, X } from "lucide-react"

export default function Navigation() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Search", href: "/search", icon: Search },
    { name: "Discover", href: "/discover", icon: Grid },
    { name: "Bookmarks", href: "/bookmarks", icon: Bookmark },
    { name: "Profile", href: "/profile", icon: User },
  ]

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 block md:hidden">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            // Skip bookmarks for non-authenticated users
            if (item.name === "Bookmarks" && !isAuthenticated) return null

            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center px-3 py-1 text-xs ${
                  active ? "text-primary" : "text-gray-600"
                }`}
              >
                <Icon className={`h-5 w-5 mb-1 ${active ? "text-primary" : "text-gray-600"}`} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex md:justify-center md:items-center md:space-x-8 md:py-4">
        {navItems.map((item) => {
          // Skip bookmarks for non-authenticated users
          if (item.name === "Bookmarks" && !isAuthenticated) return null

          const active = isActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md ${
                active ? "text-primary font-medium" : "text-gray-600"
              } hover:bg-gray-100 transition-colors`}
            >
              <Icon className="h-5 w-5 mr-2" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 right-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="fixed inset-0 bg-white z-40 md:hidden">
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            {navItems.map((item) => {
              // Skip bookmarks for non-authenticated users
              if (item.name === "Bookmarks" && !isAuthenticated) return null

              const active = isActive(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-2 rounded-md ${
                    active ? "text-primary font-medium" : "text-gray-700"
                  }`}
                >
                  <Icon className="h-6 w-6 mr-3" />
                  <span className="text-xl">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
