import { Suspense } from "react"
import { SidebarContent } from "./SidebarContent"
import { SidebarSkeleton } from "./SidebarSkeleton"
import { fetchSidebarContent } from "@/lib/sidebar"
import { getServerCountry } from "@/lib/utils/routing"
import type { SidebarContentPayload } from "@/types/sidebar"

export async function Sidebar() {
  const country = getServerCountry()
  let initialData: SidebarContentPayload | undefined

  try {
    initialData = await fetchSidebarContent({ country })
  } catch (error) {
    console.error("[sidebar] Failed to fetch initial sidebar content", error)
    initialData = { recent: [], mostRead: [] }
  }

  return (
    <aside className="hidden lg:block w-full max-w-sm xl:max-w-md space-y-6 sticky top-4 self-start">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarContent initialData={initialData} country={country} />
      </Suspense>
    </aside>
  )
}
