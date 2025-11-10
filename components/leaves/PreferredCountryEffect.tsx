"use client"

import dynamic from "next/dynamic"

const PreferredCountrySync = dynamic(
  async () => {
    const mod = await import("@/components/PreferredCountrySync")
    return mod.PreferredCountrySync
  },
  {
    ssr: false,
    loading: () => null,
  },
)

export default function PreferredCountryEffect() {
  return <PreferredCountrySync />
}
