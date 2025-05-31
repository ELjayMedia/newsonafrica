import { AdSense } from "./AdSense"
import { AD_CONFIG } from "@/config/adConfig"

export function SidebarSkyscraperAd() {
  return (
    <div className="w-full mx-auto overflow-hidden flex justify-center items-center my-4">
      <AdSense slot={AD_CONFIG.adsense.slots.sidebar} format="vertical" className="w-full max-w-[300px] h-[600px]" />
    </div>
  )
}
