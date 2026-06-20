"use client"

import { MobileNavBase } from "./navigation/MobileNavBase"

export function BottomNavigation() {
  return (
    <MobileNavBase
      ariaLabel="Bottom navigation"
      items={["home", "search", "bookmarks", "profile"]}
      styles={{
        container: "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 py-2 px-3 md:hidden",
        inner: "flex justify-around items-center",
        item: "flex flex-col items-center",
        itemActive: "text-blue-600",
        itemInactive: "text-gray-500",
        iconWrapper: "p-1 rounded-full",
        activeIconWrapper: "text-blue-600",
        inactiveIconWrapper: "text-gray-500",
        label: "mt-1",
        labelActive: "text-blue-600",
        labelInactive: "text-gray-500",
        profileAvatar: "h-7 w-7",
        profileAvatarFallback: "text-xs bg-blue-600 text-white",
      }}
      iconSize={20}
    />
  )
}
