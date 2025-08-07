"use client"

import dynamic from "next/dynamic"
import { Suspense, type ReactNode } from "react"
import { Header } from "@/components/Header"

const BottomNavigation = dynamic(
  () => import("@/components/BottomNavigation").then((mod) => ({ default: mod.BottomNavigation })),
  {
    ssr: false,
  },
)

const Sidebar = dynamic(() => import("@/components/Sidebar").then((mod) => ({ default: mod.Sidebar })), {
  ssr: false,
  loading: () => <div className="w-80 bg-white shadow-md animate-pulse h-96" />,
})

const TopBannerAd = dynamic(() => import("@/components/TopBannerAd").then((mod) => ({ default: mod.TopBannerAd })), {
  ssr: false,
})

const BelowHeaderAd = dynamic(
  () => import("@/components/BelowHeaderAd").then((mod) => ({ default: mod.BelowHeaderAd })),
  {
    ssr: false,
  },
)

const FooterBannerAd = dynamic(
  () => import("@/components/FooterBannerAd").then((mod) => ({ default: mod.FooterBannerAd })),
  {
    ssr: false,
  },
)

interface ClientLayoutComponentsProps {
  children: ReactNode
}

export default function ClientLayoutComponents({ children }: ClientLayoutComponentsProps) {
  return (
    <>
      <Suspense fallback={null}>
        <TopBannerAd />
      </Suspense>
      <Suspense fallback={<div className="h-16 bg-white shadow-md animate-pulse" />}>
        <Header />
      </Suspense>
      <Suspense fallback={null}>
        <BelowHeaderAd />
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
      <Suspense fallback={null}>
        <FooterBannerAd />
      </Suspense>
      <BottomNavigation />
    </>
  )
}
