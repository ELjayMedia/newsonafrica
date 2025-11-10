"use client"

import dynamic from "next/dynamic"

const BottomNavigation = dynamic(
  async () => {
    const mod = await import("@/components/BottomNavigation")
    return mod.BottomNavigation
  },
  {
    ssr: false,
    loading: () => null,
  },
)

export default function BottomNavigationClient() {
  return <BottomNavigation />
}
