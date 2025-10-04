"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { usePathname, useRouter } from "next/navigation"

import CountrySelector from "@/components/CountrySelector"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SearchBox } from "@/components/SearchBox"
import { WeatherWidget } from "@/components/WeatherWidget"
import { getCategoryUrl } from "@/lib/utils/routing"

export interface HeaderCategory {
  id: number
  name: string
  slug: string
  description?: string
  count?: number
}

interface HeaderClientProps {
  categories: HeaderCategory[]
  countryCode: string
}

export function HeaderClient({ categories, countryCode }: HeaderClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const hideOnMobile = ["/bookmarks", "/profile", "/subscribe"].includes(pathname)

  const sortedCategories = useMemo(
    () => (categories && categories.length > 0 ? categories : []),
    [categories],
  )

  const categoryRefs = useRef<(HTMLAnchorElement | null)[]>([])

  const activeCategoryIndex = useMemo(() => {
    return sortedCategories.findIndex(
      (category) => getCategoryUrl(category.slug, countryCode) === pathname,
    )
  }, [countryCode, pathname, sortedCategories])

  const [focusedIndex, setFocusedIndex] = useState(() => {
    if (sortedCategories.length === 0) {
      return -1
    }

    return activeCategoryIndex >= 0 ? activeCategoryIndex : 0
  })

  useEffect(() => {
    if (sortedCategories.length === 0) {
      setFocusedIndex(-1)
      return
    }

    const nextIndex = activeCategoryIndex >= 0 ? activeCategoryIndex : 0
    setFocusedIndex((prev) => (prev === nextIndex ? prev : nextIndex))
  }, [activeCategoryIndex, sortedCategories])

  const moveFocus = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= sortedCategories.length) {
      return
    }

    setFocusedIndex((prev) => {
      if (prev === nextIndex) {
        return prev
      }
      return nextIndex
    })

    setTimeout(() => {
      categoryRefs.current[nextIndex]?.focus()
    }, 0)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (sortedCategories.length === 0) {
      return
    }

    const lastIndex = sortedCategories.length - 1
    let nextIndex = index

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault()
        nextIndex = index === lastIndex ? 0 : index + 1
        break
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault()
        nextIndex = index === 0 ? lastIndex : index - 1
        break
      case "Home":
        event.preventDefault()
        nextIndex = 0
        break
      case "End":
        event.preventDefault()
        nextIndex = lastIndex
        break
      default:
        return
    }

    moveFocus(nextIndex)
  }

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [],
  )

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
            <div className="flex items-center gap-2">
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
              <CountrySelector />
            </div>

            <div className="flex items-center gap-4">
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
                {sortedCategories.map((category, index) => {
                  const url = getCategoryUrl(category.slug, countryCode)
                  const isCurrentRoute = pathname === url
                  const isFocusable = index === focusedIndex
                  return (
                    <li key={category.slug}>
                      <Link
                        href={url}
                        ref={(element) => {
                          categoryRefs.current[index] = element
                        }}
                        aria-current={isCurrentRoute ? "page" : undefined}
                        tabIndex={isFocusable ? 0 : -1}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        className={`block px-3 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                          isCurrentRoute
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
