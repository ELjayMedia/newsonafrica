# Ad serving — Revive Adserver

News On Africa ads are served by Revive Adserver at **https://ads.eljaymedia.com**
(admin: `/admin`), running on VM1 as the `eljaymedia-revive-1` container.

## Inventory

Website **News On Africa** (id 1) has one zone per placement. The reader maps
placements to zone ids in `lib/ads/zones.ts`; keep the two in sync.

| Zone | Placement key           | Size    | Where                                                    |
| ---- | ----------------------- | ------- | -------------------------------------------------------- |
| 1    | desktop-top-leaderboard | 728×90  | Above the masthead, every page (lg+)                     |
| 2    | desktop-billboard       | 970×250 | Under the header: home, edition, category, article (lg+) |
| 3    | desktop-rail-mpu        | 300×250 | Right rail between Most Read and Latest (lg+)            |
| 4    | desktop-rail-halfpage   | 300×600 | Bottom of the right rail, sticky (lg+)                   |
| 5    | desktop-infeed-mpu      | 300×250 | Every 8 stories in long feeds, centred (lg+)             |
| 6    | desktop-inarticle-mpu   | 300×250 | Article body after paragraph 4 (lg+)                     |
| 7    | desktop-takeover-left   | 160×600 | Left gutter on home routes, ≥1440px                      |
| 8    | desktop-takeover-right  | 160×600 | Right gutter on home routes, ≥1440px                     |
| 9    | mobile-top-banner       | 320×50  | Under the header on listing pages (< lg)                 |
| 10   | mobile-infeed-mpu-1     | 300×250 | Mobile home feed after story 4                           |
| 11   | mobile-infeed-mpu-2     | 300×250 | Mobile home feed after story 11 (14+ stories)            |
| 12   | mobile-inarticle-mpu-1  | 300×250 | Article body after paragraph 4 (< lg)                    |
| 13   | mobile-inarticle-mpu-2  | 300×250 | After paragraph 9 on 800+ word articles (< lg)           |
| 14   | mobile-sticky-anchor    | 320×50  | Bottom of screen above the tab bar, closable (< lg)      |

The takeover is sold as one buy: link the campaign to zones 7, 8 and 2.

**Takeover background.** Each page gutter is painted to match its own
creative, so the page blends into the ad:

1. Put `data-noa-skin="…"` anywhere in an HTML creative to choose the
   background: a colour (`#c8102e`), a gradient, or an https image
   (`url(https://…) center / cover`). Anything else is ignored.
2. Otherwise, for an image banner, the reader samples the colour along the
   image's outer edge (`/api/ads/skin`, only for images hosted on
   ads.eljaymedia.com).
3. Otherwise, for an HTML banner, its own root background is used.
4. If none of these applies, the default dark green skin.

## Wallpaper takeover (zone 15)

The wallpaper is one image behind the whole page on the home and edition
pages, on screens 1440px and wider. The page column covers its centre; the
two sides show it and click through to the banner's URL, with an
"Advertisement" label on each side.

**Creative spec** (template: `wallpaper-template-1920x1200.png`; its marked safe areas are the older, 16 px narrower ones, so they still fit):

| | |
|---|---|
| Size | **1920 × 1200 px**, JPG/PNG/WebP, under 300 KB |
| Hidden behind the page | centre **986 px** (x 467–1453): the 970 px page plus an 8 px grey edge each side; keep empty |
| Always visible (≥1440 px screens) | **227 × 640 px** beside each side of the page: x 240–467 and x 1453–1680, y 60–700. Put the logo and message here. |
| Visible only on wider screens | outer strips x 0–240 and x 1680–1920 |
| Top 37 px | under the site's black top bar |
| Edges | keep the bottom edge a flat colour: it fills any screen space beyond the image (wider than 1920px or taller than 1200px) |

The image is shown at its real size, centred at the top, and never scaled,
so the strip beside the page looks the same on every desktop. It stays in
place while the page scrolls.

**Booking it:** add a 1920×1200 *image* banner with the click-through URL,
link it to zone 15, and usually the billboard (2) too. While a wallpaper is
live, unlink zones 7 and 8 (the takeover side skyscrapers) from the house
campaign, or link the advertiser's own 160×600s, because they sit on top of
the safe area. An HTML creative can set the background with
`data-noa-skin` instead of an image. The house campaign never fills zone 15.

## How the reader loads ads

`components/ads/revive-zone.tsx` uses Revive's async tag
(`/delivery/asyncjs.php`, `<ins data-revive-zoneid … data-revive-id>`):

- A zone is only requested when the screen can show it (desktop zones from
  1024px, mobile below, takeover from 1440px), so hidden zones never count
  impressions.
- A zone stays collapsed, with no label and no space, until Revive returns a
  creative. Unsold inventory leaves nothing behind (NOA-180).
- Zones that mount together are fetched in one request. Client-side
  navigation fetches the new page's zones.
- Each request sends `source=<edition>` (`sz`, `za`, `ng`, or `pan` for
  pan-African pages). To sell a country, add a delivery rule
  _Source → is equal to → sz_ on the campaign or banner.
- Kill switch: build with `NEXT_PUBLIC_ADS_ENABLED=0`. Layout review: build
  with `NEXT_PUBLIC_AD_PREVIEW=1`, which shows labelled IAB frames instead of
  live ads.
- CSP (`next.config.ts`) allows `https://ads.eljaymedia.com` in script-src,
  connect-src and frame-src. If an advertiser's HTML creative pulls in another
  ad network, add that network there too.

## House campaign

Advertiser **News On Africa (house)** → campaign **House · Advertise with us**
is a _remnant_ campaign (priority 0). It has one HTML creative per size
linking to `/advertise`, and is linked to every zone (`$HOUSE_KEYS` in
`noa-setup.php`). To hide the house ad on a zone, unlink that zone from the
campaign in Revive (**Campaign → Linked Zones**). An unlinked, unsold zone
collapses on the site, leaving no space.

The leaderboard (1) and billboard (2) never appear on the same page: the
billboard leads the home and edition pages, and the leaderboard tops every
other page.

## Selling a placement

1. In Revive, go to **Inventory → Advertisers** and add the advertiser, then
   a campaign. Use _Contract_ or _Override_ so it outranks the house ads.
2. Add a banner at the zone's exact size.
3. Link the campaign to the zones on the campaign's **Linked Zones** tab.
4. Optionally limit it by Source (edition), dates or impressions.

## Recreating the setup

`noa-setup.php` creates the website, zones, house campaign and creatives. It
is idempotent and reuses anything that already exists by name.

```sh
sudo docker cp infra/revive/noa-setup.php eljaymedia-revive-1:/tmp/
sudo docker exec -u www-data -w /var/www/html eljaymedia-revive-1 php /tmp/noa-setup.php ads.eljaymedia.com
```

A Revive DB dump from before the first run is at
`/srv/eljaymedia/backups/revive-noa-zones-20261126_121419/` on VM1.
