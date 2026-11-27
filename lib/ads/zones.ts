/**
 * Ad inventory served by Revive Adserver (ads.eljaymedia.com, website
 * "News On Africa"). Each placement maps to one Revive zone; the zone ids are
 * public (they appear in every ad tag) and were created by the Revive setup
 * script in infra/revive/README.md. Desktop zones render from `lg` up, mobile
 * zones below it.
 *
 * NEXT_PUBLIC_ADS_ENABLED=0 at build time switches every live zone off.
 */
export const REVIVE_URL = (
  process.env.NEXT_PUBLIC_REVIVE_URL ?? "https://ads.eljaymedia.com"
).replace(/\/$/, "");
/** Revive's install id, sent as data-revive-id on every <ins> tag. */
export const REVIVE_ID = process.env.NEXT_PUBLIC_REVIVE_ID ?? "91712920500236a3b860a14f786261a4";
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== "0";

export type AdDevice = "desktop" | "mobile";

export interface AdZone {
  zoneId: number;
  width: number;
  height: number;
  device: AdDevice;
}

export const AD_ZONES = {
  "desktop-top-leaderboard": { zoneId: 1, width: 728, height: 90, device: "desktop" },
  "desktop-billboard": { zoneId: 2, width: 970, height: 250, device: "desktop" },
  "desktop-rail-mpu": { zoneId: 3, width: 300, height: 250, device: "desktop" },
  "desktop-rail-halfpage": { zoneId: 4, width: 300, height: 600, device: "desktop" },
  "desktop-infeed-mpu": { zoneId: 5, width: 300, height: 250, device: "desktop" },
  "desktop-inarticle-mpu": { zoneId: 6, width: 300, height: 250, device: "desktop" },
  "desktop-takeover-left": { zoneId: 7, width: 160, height: 600, device: "desktop" },
  "desktop-takeover-right": { zoneId: 8, width: 160, height: 600, device: "desktop" },
  /** Full-page background behind everything on home routes (≥1440px). */
  "desktop-takeover-wallpaper": { zoneId: 15, width: 1920, height: 1200, device: "desktop" },
  "mobile-top-banner": { zoneId: 9, width: 320, height: 50, device: "mobile" },
  "mobile-infeed-mpu-1": { zoneId: 10, width: 300, height: 250, device: "mobile" },
  "mobile-infeed-mpu-2": { zoneId: 11, width: 300, height: 250, device: "mobile" },
  "mobile-inarticle-mpu-1": { zoneId: 12, width: 300, height: 250, device: "mobile" },
  "mobile-inarticle-mpu-2": { zoneId: 13, width: 300, height: 250, device: "mobile" },
  "mobile-sticky-anchor": { zoneId: 14, width: 320, height: 50, device: "mobile" },
} as const satisfies Record<string, AdZone>;

export type AdPlacement = keyof typeof AD_ZONES;

/**
 * Media queries matching deviceVisibilityClass, used to skip requesting a
 * zone the current screen will not show (no phantom impressions).
 */
export const DEVICE_MEDIA: Record<AdDevice, string> = {
  desktop: "(min-width: 1024px)",
  mobile: "(max-width: 1023.98px)",
};

/** Tailwind visibility for a zone: desktop from lg, mobile below lg. */
export function deviceVisibilityClass(device: AdDevice): string {
  return device === "desktop" ? "hidden lg:block" : "lg:hidden";
}

/**
 * The edition a page belongs to, sent to Revive as `source` so campaigns can
 * be limited to one country (Delivery rules → Source). Pan-African pages send
 * "pan".
 */
export function adSourceForPath(pathname: string, isEdition: (code: string) => boolean): string {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && isEdition(first) ? first : "pan";
}
