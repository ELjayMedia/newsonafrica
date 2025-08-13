# Ads, Consent and Performance

This document outlines how advertising and consent management are integrated in the app and how to add new placements.

## Consent Flow

- Consent state is stored under `localStorage['noa.consent.tcf']`.
- `ConsentManager` provides a context and banner prompting users in the EEA.
- The state exposes `{ canServeAds, gdprApplies }` via the `useConsent()` hook.
- When consent changes a `__noaConsent` event is dispatched on `window`.

## Slot Naming and Size Maps

- All ad units are rooted at `/1234567/newsonafrica` defined in `src/features/ads/config.ts`.
- Common sizes:
  - Mobile: 320x50, 320x100, 300x250
  - Tablet: 468x60, 300x250
  - Desktop: 728x90, 970x250, 300x250, 300x600
- `makeSizeMapping()` helps create responsive size mappings for GPT.
- Each slot should render a placeholder with a min-height matching the expected size to avoid CLS.

## Adding a New Slot

1. Define an entry in `SLOTS` inside `src/features/ads/config.ts`.
2. Place an `<AdSlot>` component with the desired `slot` path and `sizes`/`sizeMapping`.
3. Provide optional key-value targeting via the `kv` prop.

## Targeting Keys

`buildAdTargeting()` produces flat key/value pairs for:
- `country`
- `category`
- `article` id
- `tags`
- `login` (1 or 0)

## Performance Rules

- GPT and all ad slots load **only after consent** and when `useAdsEnabled()` allows.
- `useAdsEnabled()` checks Data Saver and 2G connections and honors `NEXT_PUBLIC_ADS_ENABLED` and `?ads=off`.
- Slots are lazy-loaded with IntersectionObserver to keep initial network cost low.
- Use fixed placeholders to avoid layout shift.
- There is no automatic refresh; if added later keep intervals >60s and refresh only when in view.

## Kill Switch and Debugging

- Append `?ads=off` to the URL or set `NEXT_PUBLIC_ADS_ENABLED=false` to disable ads.
- Use `?ads=debug` to log slot definitions and lifecycle events in the console.
