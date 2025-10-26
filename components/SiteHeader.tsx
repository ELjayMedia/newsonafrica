"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { getCategoryUrl, getHomeHref } from "@/lib/utils/routing"
import Image from "next/image"
import { Menu, ChevronDown, Twitter, Facebook } from "lucide-react"
import { WeatherWidget } from "@/components/WeatherWidget"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SearchBox } from "@/components/SearchBox"
import { fetchAllCategories } from "@/lib/wordpress-api"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  count?: number
  children?: Category[]
}

interface CategoriesState {
  categories: Category[]
  loading: boolean
  error: string | null
}

// Loading skeleton for navigation
function NavigationSkeleton() {
  return (
    <div className="flex space-x-1 px-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-20" />
      ))}
    </div>
  )
}

// Error state for navigation
function NavigationError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-sm text-red-600 mb-2">Failed to load navigation</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

// Desktop dropdown menu for categories with subcategories
function CategoryDropdown({ category }: { category: Category }) {
  if (!category.children || category.children.length === 0) {
    return (
      <Link
        href={getCategoryUrl(category.slug)}
        className="block px-3 py-3 text-sm font-semibold text-gray-700 hover:text-blue-600 hover:border-b-2 hover:border-blue-600 transition-colors duration-200"
      >
        {category.name.toUpperCase()}
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center px-3 py-3 text-sm font-semibold text-gray-700 hover:text-blue-600 hover:border-b-2 hover:border-blue-600 transition-colors duration-200">
          {category.name.toUpperCase()}
          <ChevronDown className="ml-1 h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={getCategoryUrl(category.slug)} className="w-full">
            All {category.name}
          </Link>
        </DropdownMenuItem>
        {category.children.map((child) => (
          <DropdownMenuItem key={child.id} asChild>
            <Link href={getCategoryUrl(child.slug)} className="w-full">
              {child.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Mobile slide-over menu
function MobileMenu({
  categories,
  isOpen,
  onClose,
}: {
  categories: Category[]
  isOpen: boolean
  onClose: () => void
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {/* Search in mobile menu */}
          <div className="p-4 border-b">
            <SearchBox
              placeholder="Search articles..."
              className="w-full"
              onSearch={(_query) => {
                // Handle search
                onClose()
              }}
              showSuggestions={false}
              size="default"
            />
          </div>

          {/* Categories */}
          <nav className="p-4">
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <div className="flex items-center justify-between">
                    <Link
                      href={getCategoryUrl(category.slug)}
                      className="flex-1 py-2 text-gray-700 hover:text-blue-600 font-medium"
                      onClick={onClose}
                    >
                      {category.name}
                    </Link>
                    {category.children && category.children.length > 0 && (
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedCategories.has(category.id) ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Subcategories */}
                  {category.children && expandedCategories.has(category.id) && (
                    <ul className="ml-4 mt-2 space-y-1">
                      {category.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={getCategoryUrl(child.slug)}
                            className="block py-1 text-sm text-gray-600 hover:text-blue-600"
                            onClick={onClose}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const homeHref = getHomeHref(pathname)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [categoriesState, setCategoriesState] = useState<CategoriesState>({
    categories: [],
    loading: true,
    error: null,
  })

  const hideOnMobile = ["/bookmarks", "/profile", "/subscribe"].includes(pathname)

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesState((prev) => ({ ...prev, loading: true, error: null }))
        const categories = await fetchAllCategories()

        // Transform and organize categories (assuming flat structure from API)
        // You might need to adjust this based on your actual API response structure
        const organizedCategories = categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          count: cat.count,
          children: [], // Add logic here if you have parent-child relationships
        }))

        setCategoriesState({
          categories: organizedCategories,
          loading: false,
          error: null,
        })
      } catch (error) {
        console.error("Failed to load categories:", error)
        setCategoriesState({
          categories: [],
          loading: false,
          error: "Failed to load navigation menu",
        })
      }
    }

    loadCategories()
  }, [])

  const retryLoadCategories = () => {
    setCategoriesState((prev) => ({ ...prev, loading: true, error: null }))
    // Re-trigger the effect by updating a dependency or call loadCategories directly
  }

  return (
    <ErrorBoundary fallback={<div>Something went wrong. Please try again later.</div>}>
      <header
        className={`bg-white mx-auto max-w-[980px] shadow-md z-10 ${
          hideOnMobile ? "hidden md:block" : pathname === "/search" ? "hidden sm:block" : ""
        }`}
      >
        <div className="w-full md:mx-auto -mb-4">
          {/* Top Bar */}
          <div className="px-4 pt-3 pb-2 flex flex-wrap items-center justify-between">
            {/* Mobile menu button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link href={homeHref} className="flex items-center">
                <Image
                  src="https://lh3.googleusercontent.com/p/AF1QipOAL_nQ75pQyMwVRXrjsAIJf9yTGlCcI2ChLSvm=s680-w680-h510-rw"
                  alt="News On Africa"
                  width={200}
                  height={50}
                  className="w-auto h-8 md:h-12"
                  priority
                />
              </Link>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              {/* Desktop search */}
              <div className="hidden sm:block">
                <SearchBox
                  placeholder="Search"
                  className="w-[200px]"
                  onSearch={(query) => router.push(`/search?q=${encodeURIComponent(query)}&source=wp`)}
                  showSuggestions={false}
                  size="compact"
                />
              </div>

              {/* Social links */}
              <div className="flex items-center space-x-2">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              </div>

              {/* Weather and date */}
              <div className="flex items-center gap-2 text-sm ml-4">
                {typeof WeatherWidget !== "undefined" && <WeatherWidget />}
                <div className="hidden md:flex flex-col items-start text-gray-600 text-sm">
                  <span>{currentDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="mt-4 md:mt-0 bg-white hidden md:block">
            <div className="overflow-x-auto">
              <div className="border-t border-gray-200">
                {categoriesState.loading && <NavigationSkeleton />}
                {categoriesState.error && <NavigationError onRetry={retryLoadCategories} />}
                {!categoriesState.loading && !categoriesState.error && (
                  <ul className="flex whitespace-nowrap px-4 font-light">
                    {categoriesState.categories.map((category) => (
                      <li key={category.id}>
                        <CategoryDropdown category={category} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </nav>

          {/* Mobile slide-over menu */}
          <MobileMenu
            categories={categoriesState.categories}
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />
        </div>
      </header>
    </ErrorBoundary>
  )
}
