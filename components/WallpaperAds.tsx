"use client"

import { AdSlot } from "./AdSlot"

export function WallpaperAds() {
  return (
    <>
      <div className="fixed left-0 top-[40px] w-[calc(50%-490px)] h-[calc(100%-40px)] hidden xl:block">
        <AdSlot zoneId="left-wallpaper" />
      </div>
      <div className="fixed right-0 top-[40px] w-[calc(50%-490px)] h-[calc(100%-40px)] hidden xl:block">
        <AdSlot zoneId="right-wallpaper" />
      </div>
    </>
  )
}
