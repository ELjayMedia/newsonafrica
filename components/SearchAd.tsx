import { AdComponent } from "./AdComponent"

export function SearchAd() {
  return (
    <div className="w-full bg-transparent">
      <div className="block md:hidden">
        <AdComponent zoneId="16" className="mt-4" />
      </div>
      <div className="hidden md:block">
        <AdComponent zoneId="4" className="mt-4" />
      </div>
    </div>
  )
}
