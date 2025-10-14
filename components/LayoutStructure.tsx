import { Suspense, type ReactNode } from "react"

import { Header } from "@/components/Header"

interface LayoutStructureProps {
  children: ReactNode
}

export function LayoutStructure({ children }: LayoutStructureProps) {
  return (
    <div className="mx-auto w-full max-w-full px-0 md:max-w-[980px] md:px-4">
      <Suspense fallback={<div className="h-16 bg-white shadow-md animate-pulse" />}>
        <Header />
      </Suspense>
      <div className="mt-4 md:mt-6">
        <Suspense
          fallback={
            <div className="bg-white shadow-md md:rounded-lg overflow-hidden">
              <div className="p-4 md:p-6 space-y-4">
                <div className="h-8 w-1/3 rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-5/6 rounded bg-gray-200" />
              </div>
            </div>
          }
        >
          <div className="bg-white shadow-md md:rounded-lg overflow-hidden">
            <div className="p-2 md:p-4 w-full md:w-auto">{children}</div>
          </div>
        </Suspense>
      </div>
    </div>
  )
}
