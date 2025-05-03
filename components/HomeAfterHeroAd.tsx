import { AdComponent } from "./AdComponent"

export function HomeAfterHeroAd() {
  return (
    <div className="w-full flex justify-center">
      <div className="block md:hidden">
        <AdComponent zoneId="18" className="mt-4" />
      </div>
      <div className="hidden md:block">
        <AdComponent zoneId="12" className="mt-4" />
      </div>
    </div>
  )
}
