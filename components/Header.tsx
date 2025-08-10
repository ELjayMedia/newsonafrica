"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useUser } from "@/contexts/UserContext"
import { WeatherWidget } from "@/components/WeatherWidget"
import ErrorBoundary from "@/components/ErrorBoundary"
import { SearchBox } from "@/components/SearchBox"
import { SocialLinks } from "@/components/SocialLinks"

const categories = [
  { name: "NEWS", href: "/category/news" },
  { name: "BUSINESS", href: "/category/business" },
  { name: "SPORT", href: "/category/sport" },
  { name: "HEALTH", href: "/category/health" },
  { name: "POLITICS", href: "/category/politics" },
  { name: "OPINION", href: "/category/editorial" },
  { name: "ENTERTAINMENT", href: "/category/entertainment" },
  { name: "FOOD", href: "/category/food" },
  { name: "SPECIAL PROJECTS", href: "/special-projects" },
]

export function Header() {
  const router = useRouter()
  const { user, signOut } = useUser()
  const pathname = usePathname()
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

              <SocialLinks />

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
                {categories.map((category) => (
                  <li key={category.name}>
                    <Link
                      href={category.href}
                      className={`block px-3 py-3 text-sm font-semibold transition-colors duration-200 ${
                        pathname === category.href
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-700 hover:text-blue-600 hover:border-b-2 hover:border-blue-600"
                      }`}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </header>
    </ErrorBoundary>
  )
}
