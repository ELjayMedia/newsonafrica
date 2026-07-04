import type { MetadataRoute } from "next";

import { colorTokens } from "@/lib/design-tokens";

/** "H S% L%" channel triple (design-token format) → CSS hsl() color. */
const hsl = (channels: string) => `hsl(${channels})`;

/**
 * Web app manifest (NOA-109), served at `/manifest.webmanifest` by the Next
 * metadata-route convention and linked automatically from every page.
 *
 * Colors come from `lib/design-tokens.ts` (light theme) so the install
 * splash screen and OS chrome match the brand: primary green theme color,
 * white background. Icons are the generated brand set in `public/icons/`
 * (see `scripts/generate-pwa-icons.mjs`) with both `any` and `maskable`
 * purposes so installability checks pass on Android and desktop.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "News on Africa",
    short_name: "News on Africa",
    description: "Independent African journalism across country editions.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: hsl(colorTokens.light.background),
    theme_color: hsl(colorTokens.light.primary),
    lang: "en",
    dir: "ltr",
    categories: ["news", "magazines"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Search",
        short_name: "Search",
        description: "Search articles across all editions",
        url: "/search",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Saved articles",
        short_name: "Saved",
        description: "Your bookmarked articles",
        url: "/account/bookmarks",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
