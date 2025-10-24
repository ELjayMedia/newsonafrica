import { Suspense } from "react"
import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"
import { fetchSidebarContent } from "@/lib/sidebar"
import { DEFAULT_COUNTRY } from "@/lib/utils/routing"
import type { SidebarContentPayload } from "@/types/sidebar"

interface SidebarProps {
  country?: string
}

export async function Sidebar({ country = DEFAULT_COUNTRY }: SidebarProps = {}) {
  const normalizedCountry = (country ?? DEFAULT_COUNTRY).toLowerCase()
  let initialData: SidebarContentPayload | undefined

  try {
    initialData = await fetchSidebarContent({ country: normalizedCountry })
  } catch (error) {
    console.error("[sidebar] Failed to fetch initial sidebar content", error)
    initialData = { recent: [], mostRead: [] }
  }

  return (
    <aside className="hidden lg:block w-full max-w-sm xl:max-w-md space-y-6 sticky top-4 self-start">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent data={initialData} country={normalizedCountry} />
      </Suspense>
    </aside>
  )
}
