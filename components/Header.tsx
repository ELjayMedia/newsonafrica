"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useUser } from "@/contexts/UserContext"
import { WeatherWidget } from "@/components/WeatherWidget"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SearchBox } from "@/components/SearchBox"
import { useCategories } from "@/lib/hooks/useWordPressData"
import { getCurrentCountry, getCategoryUrl } from "@/lib/utils/routing"

export function Header() {
  const router = useRouter()
  const { user, signOut } = useUser()
  const pathname = usePathname()
  const countryCode = getCurrentCountry(pathname)
  const { categories } = useCategories(countryCode)
  const hideOnMobile = ["/bookmarks", "/profile", "/subscribe"].includes(pathname)

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
                src="https://lh3.googleusercontent.com/p/AF1QipOAL_nQ75pQyMwVRXrjsAIJf9yTGlCcI2ChLSvm=s680-w680-h510-rw"
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
          <nav className="mt-4 md:mt-0 bg-white">
            <div className="overflow-x-auto">
              <ul className="flex whitespace-nowrap px-4 border-t border-gray-200 font-light">
                {categories.map((category) => {
                  const url = getCategoryUrl(category.slug, countryCode)
                  return (
                    <li key={category.slug}>
                      <Link
                        href={url}
                        className={`block px-3 py-3 text-sm font-semibold transition-colors duration-200 ${
                          pathname === url
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-700 hover:text-blue-600 hover:border-b-2 hover:border-blue-600"
                        }`}
                      >
                        {category.name.toUpperCase()}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>
        </div>
      </header>
    </ErrorBoundary>
  )
}
