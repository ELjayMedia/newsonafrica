"use client"

import { AdComponent } from "./AdComponent"
import { AD_CONFIG } from "@/config/adConfig"

export function SidebarSkyscraperAd() {
  return (
    <div className="hidden lg:block w-full mx-auto overflow-hidden flex justify-center items-center my-4">
      <AdComponent
        adUnit={AD_CONFIG.gam.adUnits.desktopSidebar}
        width={300}
        height={600}
        slotId="sidebar-skyscraper"
        responsiveSizes={[
          [300, 600],
          [300, 250],
        ]}
        className="w-full max-w-[300px]"
        targeting={{
          position: "sidebar-skyscraper",
          device: "desktop",
        }}
      />
    </div>
  )
}
