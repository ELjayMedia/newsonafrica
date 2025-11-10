"use client"

import dynamic from "next/dynamic"

const Toaster = dynamic(
  async () => {
    const mod = await import("@/components/ui/toaster")
    return mod.Toaster
  },
  {
    ssr: false,
    loading: () => null,
  },
)

export default function GlobalToaster() {
  return <Toaster />
}
