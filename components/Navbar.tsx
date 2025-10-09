"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, Menu } from "lucide-react"
import { getCategoryUrl, getHomeHref } from "@/lib/utils/routing"

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const homeHref = getHomeHref(pathname)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchTerm.trim())}`)
      setIsSearchOpen(false)
      setSearchTerm("")
    }
  }

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  return (
    <nav className="bg-primary text-primary-foreground p-4 sticky top-0 z-30 shadow-md">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href={homeHref} className="text-2xl font-bold">
              News On Africa
            </Link>
          </div>

          <div className="hidden md:flex space-x-4">
            <Link href={getCategoryUrl("news") as string} className="hover:text-primary-foreground/80">
              News
            </Link>
            <Link href={getCategoryUrl("business") as string} className="hover:text-primary-foreground/80">
              Business
            </Link>
            <Link href={getCategoryUrl("sport") as string} className="hover:text-primary-foreground/80">
              Sport
            </Link>
          </div>

          <div className="flex items-center">
            {isSearchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center">
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full md:w-64 text-primary bg-white"
                  aria-label="Search"
                />
                <Button type="submit" className="ml-2" aria-label="Submit search">
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsSearchOpen(false)}
                  className="ml-1"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} aria-label="Open search">
                <Search className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 bg-primary-foreground/10 rounded-md p-4">
            <div className="flex flex-col space-y-3">
              <Link
                href={getCategoryUrl("news") as string}
                className="text-primary-foreground hover:text-primary-foreground/80 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                News
              </Link>
              <Link
                href={getCategoryUrl("business") as string}
                className="text-primary-foreground hover:text-primary-foreground/80 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Business
              </Link>
              <Link
                href={getCategoryUrl("sport") as string}
                className="text-primary-foreground hover:text-primary-foreground/80 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sport
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
