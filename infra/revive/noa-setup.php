<?php
// Create the News On Africa website, its 14 zones, and a house campaign with
// "Advertise with us" creatives. Idempotent: re-running reuses what exists.
// Run inside the Revive container AS www-data (root leaves cache files Revive
// cannot rewrite -> "File permission errors detected"):
//   docker exec -u www-data -w /var/www/html eljaymedia-revive-1 php /tmp/noa-setup.php ads.eljaymedia.com
require_once '/var/www/html/init.php';
require_once MAX_PATH . '/lib/max/Admin_DA.php';
require_once MAX_PATH . '/lib/max/Dal/Admin/Zones.php';
require_once MAX_PATH . '/lib/OA/Dal.php';
require_once MAX_PATH . '/www/admin/lib-zones.inc.php';
require_once MAX_PATH . '/lib/max/other/lib-io.inc.php';

$SITE = 'https://app.newsonafrica.com';
$ZONES = [
  // key => [name, width, height, description]
  'desktop-top-leaderboard'   => ['NOA · Desktop · Top leaderboard', 728, 90,  'Above the masthead on every page (lg+).'],
  'desktop-billboard'         => ['NOA · Desktop · Billboard', 970, 250, 'Under the header on home, edition, category and article pages (lg+).'],
  'desktop-rail-mpu'          => ['NOA · Desktop · Rail MPU', 300, 250, 'Right rail between Most Read and Latest (home and articles, lg+).'],
  'desktop-rail-halfpage'     => ['NOA · Desktop · Rail half-page (sticky)', 300, 600, 'Bottom of the right rail, sticks while scrolling (lg+).'],
  'desktop-infeed-mpu'        => ['NOA · Desktop · In-feed MPU', 300, 250, 'Between story rows in long feeds, centred (lg+).'],
  'desktop-inarticle-mpu'     => ['NOA · Desktop · In-article MPU', 300, 250, 'Inside the article body after paragraph 4 (lg+).'],
  'desktop-takeover-left'     => ['NOA · Desktop · Takeover skin left', 160, 600, 'Left page gutter on home routes, viewport >= 1440px. Sell with the right skin and billboard.'],
  'desktop-takeover-right'    => ['NOA · Desktop · Takeover skin right', 160, 600, 'Right page gutter on home routes, viewport >= 1440px.'],
  'desktop-takeover-wallpaper'=> ['NOA · Desktop · Takeover wallpaper', 1920, 1200, 'Full-page background image behind everything on home routes, viewport >= 1440px. Upload a 1920x1200 image banner; the page gutters show it and click through to the banner URL. See infra/revive/README.md for the safe areas.'],
  'mobile-top-banner'         => ['NOA · Mobile · Top banner', 320, 50, 'Under the header on listing pages (< lg).'],
  'mobile-infeed-mpu-1'       => ['NOA · Mobile · In-feed MPU 1', 300, 250, 'Mobile home feed after story 4.'],
  'mobile-infeed-mpu-2'       => ['NOA · Mobile · In-feed MPU 2', 300, 250, 'Mobile home feed after story 11 (deep feeds only).'],
  'mobile-inarticle-mpu-1'    => ['NOA · Mobile · In-article MPU 1', 300, 250, 'Article body after paragraph 4 (< lg).'],
  'mobile-inarticle-mpu-2'    => ['NOA · Mobile · In-article MPU 2', 300, 250, 'Article body after paragraph 9, long articles only (< lg).'],
  'mobile-sticky-anchor'      => ['NOA · Mobile · Sticky anchor', 320, 50, 'Bottom of the screen above the tab bar, closable (< lg).'],
];

function one($table, array $where) {
  $do = OA_Dal::factoryDO($table);
  foreach ($where as $k => $v) $do->$k = $v;
  return $do->find(true) ? $do : null;
}

// 1. Website
$site = one('affiliates', ['name' => 'News On Africa', 'agencyid' => 1]);
if (!$site) {
  $site = OA_Dal::factoryDO('affiliates');
  $site->agencyid = 1;
  $site->name = 'News On Africa';
  $site->website = $SITE;
  $site->contact = 'News On Africa';
  $site->email = 'ads@newsonafrica.com';
  $site->affiliateid = $site->insert();
}
$siteId = (int) $site->affiliateid;

// Zones that carry the house ad; any zone not listed collapses until sold.
// All zones by default (owner's call, 2026-11-26): unwanted ones are switched
// off per zone in Revive.
$HOUSE_KEYS = array_values(array_diff(array_keys($ZONES), ['desktop-takeover-wallpaper']));
// (The wallpaper needs a real full-page image, so no house creative there.)
// Zones renamed since the first run (old key => new key).
$RENAMED = ['desktop-infeed-leaderboard' => 'desktop-infeed-mpu'];

// 2. Zones (found by their "reader key" comment, so renames update in place)
$zoneIds = [];
foreach ($ZONES as $key => [$name, $w, $h, $desc]) {
  $z = one('zones', ['affiliateid' => $siteId, 'comments' => 'reader key: ' . $key]);
  $old = array_search($key, $RENAMED, true);
  if (!$z && $old !== false) $z = one('zones', ['affiliateid' => $siteId, 'comments' => 'reader key: ' . $old]);
  if ($z && ($z->zonename !== $name || (int) $z->width !== $w || (int) $z->height !== $h || $z->comments !== 'reader key: ' . $key)) {
    $z->zonename = $name;
    $z->description = $desc;
    $z->comments = 'reader key: ' . $key;
    $z->width = $w;
    $z->height = $h;
    $z->update();
  }
  if (!$z) {
    $z = OA_Dal::factoryDO('zones');
    $z->affiliateid = $siteId;
    $z->zonename = $name;
    $z->description = $desc;
    $z->comments = 'reader key: ' . $key;
    $z->delivery = phpAds_ZoneBanner;
    $z->zonetype = phpAds_ZoneCampaign;
    $z->width = $w;
    $z->height = $h;
    $z->zoneid = $z->insert();
  }
  $zoneIds[$key] = (int) $z->zoneid;
}

// 3. House advertiser + remnant campaign
$client = one('clients', ['clientname' => 'News On Africa (house)', 'agencyid' => 1]);
if (!$client) {
  $client = OA_Dal::factoryDO('clients');
  $client->agencyid = 1;
  $client->clientname = 'News On Africa (house)';
  $client->contact = 'News On Africa';
  $client->email = 'ads@newsonafrica.com';
  $client->clientid = $client->insert();
}
$clientId = (int) $client->clientid;

$camp = one('campaigns', ['clientid' => $clientId, 'campaignname' => 'House · Advertise with us']);
if (!$camp) {
  $camp = OA_Dal::factoryDO('campaigns');
  $camp->clientid = $clientId;
  $camp->campaignname = 'House · Advertise with us';
  $camp->priority = 0;          // remnant: only fills what paid campaigns leave
  $camp->weight = 1;
  $camp->status = OA_ENTITY_STATUS_RUNNING;
  $camp->campaignid = $camp->insert();
}
$campId = (int) $camp->campaignid;

$dalZones = OA_Dal::factoryDAL('zones');
$houseZoneIds = array_values(array_intersect_key($zoneIds, array_flip($HOUSE_KEYS)));
$dalZones->linkZonesToCampaign($houseZoneIds, $campId);

// 4. House creatives, one per size
$creative = function (int $w, int $h): string {
  $big = $h >= 250;
  $tiny = $h <= 90;
  $headline = $tiny ? 'Advertise with News On Africa' : 'Reach readers across Africa';
  $sub = $tiny ? 'Reach readers across Africa — get in touch →' : 'Display, sponsored stories and takeovers on News On Africa.';
  $dir = ($w <= 320 && $h >= 250) || $h > $w ? 'column' : 'row';
  $hs = $tiny ? ($h <= 50 ? 13 : 20) : ($w >= 970 ? 34 : 24);
  $ss = $tiny ? ($h <= 50 ? 10 : 13) : 14;
  $cta = $tiny ? '' : '<span style="display:inline-block;margin-top:14px;padding:9px 18px;border-radius:999px;background:#2ad07a;color:#0c1410;font-weight:800;font-size:13px">Advertise with us →</span>';
  return '<a href="{clickurl}" target="_top" style="display:flex;flex-direction:' . $dir . ';align-items:' . ($dir === 'row' ? 'center' : 'flex-start') . ';justify-content:' . ($dir === 'row' ? 'space-between' : 'center') . ';gap:12px;box-sizing:border-box;width:' . $w . 'px;height:' . $h . 'px;padding:' . ($h <= 50 ? '6px 12px' : '18px 22px') . ';background:linear-gradient(135deg,#0b5e2d,#15994a);color:#fff;text-decoration:none;font-family:Archivo,Arial,sans-serif;overflow:hidden">'
    . '<span style="display:block"><span style="display:block;font-size:' . ($h <= 50 ? 9 : 11) . 'px;letter-spacing:.16em;font-weight:800;color:#9fe3bd;text-transform:uppercase">News On Africa</span>'
    . '<span style="display:block;font-size:' . $hs . 'px;line-height:1.1;font-weight:900;margin-top:' . ($h <= 50 ? 1 : 6) . 'px">' . $headline . '</span>'
    . ($big ? '<span style="display:block;font-size:' . $ss . 'px;line-height:1.4;color:#d7efe0;margin-top:8px;max-width:' . min($w - 44, 520) . 'px">' . $sub . '</span>' : ($h > 50 ? '<span style="display:block;font-size:' . $ss . 'px;color:#d7efe0;margin-top:4px">' . $sub . '</span>' : ''))
    . '</span>' . $cta . '</a>';
};
$sizes = [];
foreach ($ZONES as $k => [$n, $w, $h]) {
  if (in_array($k, $HOUSE_KEYS, true)) $sizes["{$w}x{$h}"] = [$w, $h];
}
foreach ($sizes as $label => [$w, $h]) {
  $bname = "House · Advertise with us · $label";
  if (one('banners', ['campaignid' => $campId, 'description' => $bname])) continue;
  $b = OA_Dal::factoryDO('banners');
  $b->campaignid = $campId;
  $b->description = $bname;
  $b->storagetype = 'html';
  $b->contenttype = 'html';
  $b->width = $w;
  $b->height = $h;
  $b->url = $SITE . '/advertise?utm_source=noa&utm_medium=house_ad&utm_campaign=advertise_' . $label;
  $b->target = '_top';
  $b->htmltemplate = $creative($w, $h);
  $b->weight = 1;
  $b->status = OA_ENTITY_STATUS_RUNNING;
  $b->autohtml = 't';
  $b->adserver = '';
  $b->iframe_friendly = 1;
  $b->insert();
}
// Re-link so every new banner lands on its matching-size house zones, and
// take the house ad off every other zone.
$dalZones->linkZonesToCampaign($houseZoneIds, $campId);
$notHouse = array_values(array_diff(array_values($zoneIds), $houseZoneIds));
if ($notHouse) $dalZones->unlinkZonesFromCampaign($notHouse, $campId);

// Linking changes only reach delivery once Revive's delivery cache (20 min by
// default) expires: clear it so they apply now.
foreach (glob(MAX_PATH . '/var/cache/deliverycache_*') ?: [] as $f) {
  @unlink($f);
}

echo json_encode(['website' => $siteId, 'campaign' => $campId, 'zones' => $zoneIds, 'house_zones' => $houseZoneIds], JSON_PRETTY_PRINT), "\n";
