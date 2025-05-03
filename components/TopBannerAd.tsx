"use client";

import { AdErrorBoundary } from "./AdErrorBoundary";
import { AdSense } from "./AdSense";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function TopBannerAd() {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className="w-full my-2 flex justify-center">
      <AdErrorBoundary collapse={true}>
        {isDesktop ? (
          // Desktop banner (728x90)
          <AdSense
            slot="1234567890"
            format="horizontal"
            className="max-w-full overflow-hidden hidden md:block"
            minWidth={728}
          />
        ) : (
          // Mobile banner (320x50)
          <AdSense
            slot="1234567890"
            format="rectangle"
            className="max-w-full overflow-hidden md:hidden"
            minWidth={300}
          />
        )}
      </AdErrorBoundary>
    </div>
  );
}
