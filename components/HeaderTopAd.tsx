import { HorizontalAd } from "./HorizontalAd"

export function HeaderTopAd() {
  return (
    <div className="flex justify-center items-center w-full bg-transparent">
      <div className="w-full max-w-[980px]">
        <HorizontalAd zoneId="10" className="mt-4 mx-auto" />
      </div>
    </div>
  )
}
