"use client"

import { MobileNavBase } from "./navigation/MobileNavBase"

export function CompactBottomNav() {
  return (
    <MobileNavBase
      ariaLabel="Compact bottom navigation"
      items={["home", "search", "bookmarks", "profile"]}
      itemOverrides={{
        bookmarks: { label: "Saved" },
      }}
      styles={{
        container: "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden",
        inner: "flex justify-around items-center py-1 px-1",
        item: "flex flex-col items-center justify-center min-w-0 flex-1 py-1 relative",
        itemActive: "text-blue-600",
        itemInactive: "text-gray-500",
        icon: "transition-colors",
        activeIcon: "text-blue-600",
        inactiveIcon: "text-gray-500",
        label: "mt-0.5 truncate max-w-full",
        labelActive: "text-blue-600 font-medium",
        labelInactive: "text-gray-500",
        profileAvatar: "h-5 w-5",
        profileAvatarFallback: "text-xs bg-blue-600 text-white",
        badge: "absolute -top-1 -right-1 h-3 w-3 text-[10px] flex items-center justify-center bg-red-600 text-white rounded-full",
      }}
      iconSize={18}
    />
  )
}
