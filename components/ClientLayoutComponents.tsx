"use client"

import { Suspense, type ReactNode } from "react"
import type React from "react"
import Link from "next/link"

import { ClientWrapper } from "@/components/ClientWrapper"
import { TopBar } from "@/components/TopBar"
import { ScrollToTop } from "@/components/ScrollToTop"
import { ClientDynamicComponents } from "@/app/ClientDynamicComponents"
import { BottomNavigation } from "@/components/BottomNavigation"
import { Sidebar as AppSidebar } from "@/components/Sidebar"
import {
  SidebarProvider,
  Sidebar as SidebarRoot,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"

interface ClientLayoutComponentsProps {
  children: ReactNode
}

export function ClientLayoutComponents({ children }: ClientLayoutComponentsProps) {
  return (
    <SidebarProvider>
      <ClientWrapper>
        <SidebarRoot
          collapsible="offcanvas"
          side="right"
          className="bg-transparent"
          style={{
            "--sidebar-width": "20rem",
          } as React.CSSProperties}
        >
          <AppSidebar />
        </SidebarRoot>
        <SidebarInset className="bg-transparent">
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
          <ClientDynamicComponents />
          <TopBar />
          {children}
          <footer className="mx-auto mt-3 mb-16 text-center text-sm text-gray-500 md:mb-2 md:max-w-[980px]">
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            {" | "}
            <Link href="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
            {" | "}
            <Link href="/sitemap.xml" className="hover:underline">
              Sitemap
            </Link>
          </footer>
          <BottomNavigation />
          <Toaster />
        </SidebarInset>
      </ClientWrapper>
    </SidebarProvider>
  )
}
