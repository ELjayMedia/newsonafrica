"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  MobileNavBase,
  type MobileNavItemKey,
  useMobileNavigation,
} from "./navigation/MobileNavBase"

const NAV_ITEM_KEYS: MobileNavItemKey[] = ["home", "search", "discover", "bookmarks", "profile"]

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const navigationData = useMobileNavigation({
    items: NAV_ITEM_KEYS,
    itemOverrides: {
      bookmarks: { hideWhenUnauthenticated: true },
      profile: { href: "/profile", activePaths: ["/profile"] },
    },
  })

  const { items } = navigationData

  return (
    <>
      <MobileNavBase
        ariaLabel="Primary navigation"
        items={NAV_ITEM_KEYS}
        itemOverrides={{
          bookmarks: { hideWhenUnauthenticated: true },
          profile: { href: "/profile", activePaths: ["/profile"] },
        }}
        styles={{
          container: "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 block md:hidden",
          inner: "flex justify-around items-center py-2",
          item: "flex flex-col items-center justify-center px-3 py-1 text-xs",
          itemActive: "text-primary",
          itemInactive: "text-gray-600",
          icon: "mb-1 h-5 w-5",
          activeIcon: "text-primary",
          inactiveIcon: "text-gray-600",
          label: "text-xs",
        }}
        data={navigationData}
      />

      <div className="hidden md:flex md:justify-center md:items-center md:space-x-8 md:py-4">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md ${
                item.isActive ? "text-primary font-medium" : "text-gray-600"
              } hover:bg-gray-100 transition-colors`}
            >
              <Icon className="h-5 w-5 mr-2" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 right-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-white z-40 md:hidden">
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            {items.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-2 rounded-md ${
                    item.isActive ? "text-primary font-medium" : "text-gray-700"
                  }`}
                >
                  <Icon className="h-6 w-6 mr-3" />
                  <span className="text-xl">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
