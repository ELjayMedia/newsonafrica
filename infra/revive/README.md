# Ad serving — Revive Adserver

News On Africa ads are served by Revive Adserver at **https://ads.eljaymedia.com**
(admin: `/admin`), running on VM1 as the `eljaymedia-revive-1` container.

## Inventory

Website **News On Africa** (id 1) has one zone per placement. The reader maps
placements to zone ids in `lib/ads/zones.ts`; keep the two in sync.

| Zone | Placement key | Size | Where |
|---|---|---|---|
| 1 | desktop-top-leaderboard | 728×90 | Above the masthead, every page (lg+) |
| 2 | desktop-billboard | 970×250 | Under the header: home, edition, category, article (lg+) |
| 3 | desktop-rail-mpu | 300×250 | Right rail between Most Read and Latest (lg+) |
| 4 | desktop-rail-halfpage | 300×600 | Bottom of the right rail, sticky (lg+) |
| 5 | desktop-infeed-leaderboard | 728×90 | Every 8 stories in long feeds (lg+) |
| 6 | desktop-inarticle-mpu | 300×250 | Article body after paragraph 4 (lg+) |
| 7 | desktop-takeover-left | 160×600 | Left gutter on home routes, ≥1440px |
| 8 | desktop-takeover-right | 160×600 | Right gutter on home routes, ≥1440px |
| 9 | mobile-top-banner | 320×50 | Under the header on listing pages (< lg) |
| 10 | mobile-infeed-mpu-1 | 300×250 | Mobile home feed after story 4 |
| 11 | mobile-infeed-mpu-2 | 300×250 | Mobile home feed after story 11 (14+ stories) |
| 12 | mobile-inarticle-mpu-1 | 300×250 | Article body after paragraph 4 (< lg) |
| 13 | mobile-inarticle-mpu-2 | 300×250 | After paragraph 9 on 800+ word articles (< lg) |
| 14 | mobile-sticky-anchor | 320×50 | Bottom of screen above the tab bar, closable (< lg) |

The takeover is sold as one buy: link the campaign to zones 7, 8 and 2.

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
  *Source → is equal to → sz* on the campaign or banner.
- Kill switch: build with `NEXT_PUBLIC_ADS_ENABLED=0`. Layout review: build
  with `NEXT_PUBLIC_AD_PREVIEW=1`, which shows labelled IAB frames instead of
  live ads.
- CSP (`next.config.ts`) allows `https://ads.eljaymedia.com` in script-src,
  connect-src and frame-src. If an advertiser's HTML creative pulls in another
  ad network, add that network there too.

## House campaign

Advertiser **News On Africa (house)** → campaign **House · Advertise with us**
is a *remnant* campaign (priority 0). It has one HTML creative per size
linking to `/advertise`, and fills every zone that paid campaigns leave
empty. Pause it to let unsold zones collapse instead.

## Selling a placement

1. In Revive, go to **Inventory → Advertisers** and add the advertiser, then
   a campaign. Use *Contract* or *Override* so it outranks the house ads.
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
