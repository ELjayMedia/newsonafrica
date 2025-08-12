"use client"
import * as NavigationMenu from "@radix-ui/react-navigation-menu"
import Link from "next/link"
import { navConfig } from "@/config/nav"

export function MegaNav() {
  return (
    <NavigationMenu.Root className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <NavigationMenu.List className="flex gap-4 px-4 py-2">
        {navConfig.map((item) => (
          <NavigationMenu.Item key={item.title}>
            <NavigationMenu.Link asChild>
              <Link href={item.href} className="text-sm font-medium focus:outline-none focus:ring">
                {item.title}
              </Link>
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  )
}
