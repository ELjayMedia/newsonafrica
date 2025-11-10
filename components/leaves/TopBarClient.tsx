"use client"

import dynamic from "next/dynamic"

const TopBar = dynamic(
  async () => {
    const mod = await import("@/components/TopBar")
    return mod.TopBar
  },
  {
    ssr: false,
    loading: () => null,
  },
)

export default function TopBarClient() {
  return <TopBar />
}
