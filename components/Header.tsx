"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { useUser } from "@/contexts/UserContext"
import { WeatherWidget } from "@/components/WeatherWidget"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SearchBox } from "@/components/SearchBox"
import { useNavigationRouting } from "@/hooks/useNavigationRouting"
import { getCategories, type WordPressCategory } from "@/lib/api/wordpress"
import { Loader2 } from "lucide-react"


export function Header() {
  const router = useRouter()
  const { user, signOut } = useUser()
  const pathname = usePathname()
  const hideOnMobile = ["/bookmarks", "/profile", "/subscribe"].includes(pathname)

  const { currentCountry, activeSlug, navigateTo } = useNavigationRouting()

  const [categories, setCategories] = useState<WordPressCategory[]>([])
  const [isLoadingCats, setIsLoadingCats] = useState(true)
  const [catError, setCatError] = useState(false)

  const fetchCats = useCallback(async () => {
    try {
      setCatError(false)
      setIsLoadingCats(true)
      const data = await getCategories(currentCountry)
      setCategories(data)
    } catch (err) {
      console.error("Failed to load categories", err)
      setCatError(true)
    } finally {
      setIsLoadingCats(false)
    }
  }, [currentCountry])

  useEffect(() => {
    fetchCats()
  }, [fetchCats])

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })

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
            <Link href="/" className="flex items-center">
              <Image
                src="https://cdn-lfdfp.nitrocdn.com/tGnEpDbnzCtvjAvVZffQUmdjuAmWqNDQ/assets/images/optimized/rev-dc17211/newsonafrica.com/wp-content/uploads/2024/09/cropped-cropped-News-On-Africa.jpg"
                alt="News On Africa"
                width={200}
                height={50}
                className="w-auto h-8 md:h-12"
                priority
              />
            </Link>

            <div className="flex items-center gap-4 ml-auto">
              <div className="hidden sm:block">
                <SearchBox
                  placeholder="Search"
                  className="w-[200px]"
                  onSearch={(query) => router.push(`/search?q=${encodeURIComponent(query)}&source=wp`)}
                  showSuggestions={false}
                  size="compact"
                />
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                    aria-label="LinkedIn"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                    aria-label="Twitter"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                    aria-label="Facebook"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm ml-4">
                {typeof WeatherWidget !== "undefined" && <WeatherWidget />}
                <div className="hidden md:flex flex-col items-start text-gray-600 text-sm">
                  <span>{currentDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-4 md:mt-0 bg-white" aria-label="Site categories">
            <div className="overflow-x-auto">
              {isLoadingCats ? (
                <div className="flex justify-center py-3" aria-live="polite" aria-busy="true">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : catError ? (
                <div className="py-3 text-center">
                  <button
                    onClick={fetchCats}
                    className="px-3 py-2 text-sm border border-blue-600 text-blue-600 rounded"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <ul className="flex whitespace-nowrap px-4 border-t border-gray-200 font-light">
                  {categories.map((category) => (
                    <li key={category.slug} tabIndex={0}>
                      <button
                        onClick={() => navigateTo(category.slug, currentCountry)}
                        aria-current={activeSlug === category.slug ? "page" : undefined}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigateTo(category.slug, currentCountry)
                          }
                        }}
                        className={`block px-3 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                          activeSlug === category.slug
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-700 hover:text-blue-600 hover:border-b-2 hover:border-blue-600"
                        }`}
                      >
                        {category.name.toUpperCase()}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </nav>
        </div>
      </header>
    </ErrorBoundary>
  )
}
