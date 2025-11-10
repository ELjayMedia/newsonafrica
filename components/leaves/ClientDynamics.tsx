"use client"

import dynamic from "next/dynamic"

const ClientDynamicComponents = dynamic(
  async () => {
    const mod = await import("@/app/ClientDynamicComponents")
    return mod.ClientDynamicComponents
  },
  {
    ssr: false,
    loading: () => null,
  },
)

export default function ClientDynamics() {
  return <ClientDynamicComponents />
}
