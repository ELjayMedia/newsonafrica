"use client"

import { AdComponent } from "./AdComponent"
import { AD_CONFIG } from "@/config/adConfig"

export function SidebarAd() {
  return (
    <div className="hidden md:block w-full">
      <AdComponent
        adUnit={AD_CONFIG.gam.adUnits.desktopSidebar}
        width={300}
        height={250}
        slotId="sidebar-rectangle"
        responsiveSizes={AD_CONFIG.gam.responsiveSizes.sidebar}
        className="mx-auto"
        targeting={{
          position: "sidebar",
          device: "desktop",
        }}
      />
    </div>
  )
}
