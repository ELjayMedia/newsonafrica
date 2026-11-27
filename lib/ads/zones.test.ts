import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { AD_ZONES, adSourceForPath, deviceVisibilityClass } from "@/lib/ads/zones";

const isEdition = (code: string) => ["sz", "za", "ng"].includes(code);

describe("Revive ad zones", () => {
  it("maps every placement to a distinct Revive zone", () => {
    const ids = Object.values(AD_ZONES).map((z) => z.zoneId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(15);
  });

  it("keeps desktop and mobile zones apart by name and breakpoint", () => {
    for (const [key, zone] of Object.entries(AD_ZONES)) {
      expect(key.startsWith(`${zone.device}-`)).toBe(true);
    }
    expect(deviceVisibilityClass("desktop")).toBe("hidden lg:block");
    expect(deviceVisibilityClass("mobile")).toBe("lg:hidden");
  });

  it("only uses mobile-safe widths for mobile zones", () => {
    for (const zone of Object.values(AD_ZONES)) {
      if (zone.device === "mobile") expect(zone.width).toBeLessThanOrEqual(320);
    }
  });

  it("sends the edition as the Revive source", () => {
    expect(adSourceForPath("/sz/article/foo", isEdition)).toBe("sz");
    expect(adSourceForPath("/za", isEdition)).toBe("za");
    expect(adSourceForPath("/", isEdition)).toBe("pan");
    expect(adSourceForPath("/advertise", isEdition)).toBe("pan");
  });

  it("lets the Revive ad server through the CSP", () => {
    const config = readFileSync("next.config.ts", "utf8");
    for (const directive of ["script-src", "connect-src", "frame-src"]) {
      expect(config).toMatch(new RegExp(`${directive} [^;]*https://ads\\.eljaymedia\\.com`));
    }
  });

  it("no longer ships hard-coded partner placeholders as ads", () => {
    for (const file of ["components/article/article-body.tsx", "components/home/mobile-feed.tsx"]) {
      expect(readFileSync(file, "utf8")).not.toContain("News On Africa Partner");
    }
  });
});

describe("device media queries", () => {
  it("split exactly at the lg breakpoint", async () => {
    const { DEVICE_MEDIA } = await import("@/lib/ads/zones");
    expect(DEVICE_MEDIA.desktop).toBe("(min-width: 1024px)");
    expect(DEVICE_MEDIA.mobile).toBe("(max-width: 1023.98px)");
  });
});
