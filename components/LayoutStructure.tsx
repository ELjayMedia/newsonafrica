import { Suspense, type ReactNode } from "react"

import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"

interface LayoutStructureProps {
  children: ReactNode
}

export function LayoutStructure({ children }: LayoutStructureProps) {
  return (
    <>
      <Suspense fallback={<div className="h-16 bg-white shadow-md animate-pulse" />}>
        <Header />
      </Suspense>
      <div className="mt-4 md:mt-6">
        <div className="flex flex-col lg:flex-row lg:gap-2 lg:items-start">
          <Suspense
            fallback={
              <div className="flex-1 bg-white shadow-md md:rounded-lg overflow-hidden lg:max-w-[calc(100%-320px)] p-4 animate-pulse">
                <div className="h-8 bg-gray-200 w-1/3 mb-4 rounded"></div>
                <div className="h-4 bg-gray-200 w-full mb-2 rounded"></div>
                <div className="h-4 bg-gray-200 w-5/6 mb-4 rounded"></div>
              </div>
            }
          >
            {children}
          </Suspense>
          <aside className="mt-6 lg:mt-0 lg:w-80 lg:flex-shrink-0">
            <Suspense fallback={<div className="w-full bg-white shadow-md animate-pulse h-96" />}>
              <Sidebar />
            </Suspense>
          </aside>
        </div>
      </div>
    </>
  )
}
