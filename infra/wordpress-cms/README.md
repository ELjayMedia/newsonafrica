# News On Africa headless WordPress CMS (`cms.newsonafrica.com`)

The new home for News On Africa editorial content: a headless WordPress on the EljayMedia VM (Coolify),
with a private MySQL and Cloudflare R2 for media. It was deployed on 2026-11-15 and converted to a **subdirectory multisite network**
on 2026-11-16 to mirror the source (`/` main, `/sz` = blog 2, `/za` = 3, `/ng` = 4). It holds **no production content yet**.
The live sources are still the cPanel multisite at `newsonafrica.com` (164.160.91.47) and the
Next.js reader at `app.newsonafrica.com`. Neither has been changed.

No credentials are in this directory. Secrets live in Coolify env vars and in root-only files under
`/srv/eljaymedia/secrets/newsonafrica/` on the VM.

## 1. Resources

| What | Where | Notes |
|---|---|---|
| Coolify project / env | `newsonafrica` (`zv9coz5wyuulbqelxfpokqcw`) / `production` | same project as the reader app `bpn1vrazffmj4zfbfpb8vkft` |
| WordPress | Coolify **service** `noa-wordpress-cms` (`fv3fqo7fe0dryfdgho4xcceg`) | containers `wordpress-<uuid>`, `wp-cron-<uuid>` |
| MySQL | Coolify **database** `noa-wp-mysql` (`pilolo1nw5krlso5azw5u9hl`) | DB `newsonafrica_wp`, user `noa_wp` (grants on that DB only) |
| Server | `localhost` (`owksm31vextkbuug88e7zoip`), ARM64, 2 vCPU / 12 GB | |

## 2. Images (pinned by digest)

| Image | Digest | Runtime |
|---|---|---|
| `wordpress:7.1.4-php8.4-apache` | `sha256:63dbbdf2…4db0` | WordPress 7.1.4, **PHP 8.4.27** |
| `wordpress:cli-2.12.0-php8.4` | `sha256:37b7e3ed…9e55` | WP-CLI (admin only, `noa-wp-cli.sh`) |
| `mysql:8.4.13` | `sha256:a81d0439…0902` | MySQL 8.4 LTS |

**PHP2Shell (CVE-2026-109618 / CVE-2026-109619):** these are fixed in PHP 8.5.12 / 8.4.27 / 8.3.36 / 8.2.35. Both WordPress images
run PHP 8.4.27. Coolify itself is v4.7.5 on PHP 8.4.27; the patched lines start at v4.4.7. Coolify's disabled one-click WordPress
template was **not** used. When you bump an image, re-check `php -v` inside it before deploying.

## 3. Networking, domains, TLS

```
browser ─HTTPS─> Cloudflare (proxied CNAME cms → tunnel 38a98bd6) ─> cloudflared ─HTTP─> coolify-proxy (Traefik :80)
        ─> wordpress-<uuid>:80 ──(coolify network)──> pilolo1nw5krlso5azw5u9hl:3306 (MySQL, no host port)
```

- DNS: `cms.newsonafrica.com` CNAME `38a98bd6-90fd-43f9-afc2-a199cb136f32.cfargotunnel.com`, proxied (record `cca29bf7…`).
- Tunnel ingress (remote-managed, v14): `cms.newsonafrica.com → http://coolify-proxy:80`.
- The Coolify FQDN **must be `http://cms.newsonafrica.com`**. TLS ends at Cloudflare. An `https://` FQDN makes Traefik add
  `redirect-to-https` on the :80 router, and every request loops.
- WordPress detects HTTPS from `CF-Visitor` / `X-Forwarded-Proto` (`WORDPRESS_CONFIG_EXTRA`). The network domain
  (`DOMAIN_CURRENT_SITE`) comes from `NOA_CMS_URL`. `WP_HOME` / `WP_SITEURL` are deliberately **not** defined: in a network they
  would force every edition onto the main site's URL. Admin cookies are `secure; HttpOnly`.
- Multisite rewrites are in `apache/noa.conf` (`<Directory /var/www/html>`, `AllowOverride None`), not `.htaccess`, because core
  files are re-copied from the image on every deploy.
- Edition endpoints: `https://cms.newsonafrica.com/<cc>/wp-json/` and `https://cms.newsonafrica.com/<cc>/graphql`
  (`<cc>` = `sz`, `za`, `ng`; the main site has no prefix). Network admin: `/wp-admin/network/`.
- Cloudflare caching: HTML, admin and REST responses are `DYNAMIC` (not cached). Media should be cached from the R2 custom domain (section 5).
- No MySQL port is published anywhere. Port 80 of WordPress is only reachable via Traefik on the `coolify` network.

## 4. Configuration

Environment variables on the Coolify service (names only):

| Variable | Purpose |
|---|---|
| `WORDPRESS_DB_HOST` | `pilolo1nw5krlso5azw5u9hl:3306` |
| `WORDPRESS_DB_NAME` / `WORDPRESS_DB_USER` / `WORDPRESS_DB_PASSWORD` | DB credentials (password = `secrets/newsonafrica/mysql-noa_wp-password`) |
| `WORDPRESS_TABLE_PREFIX` | `wp_` (set explicitly; Coolify passes blanks through) |
| `WORDPRESS_{AUTH,SECURE_AUTH,LOGGED_IN,NONCE}_{KEY,SALT}` | salts (`secrets/newsonafrica/wp-salts.env`) |
| `NOA_CMS_URL` | `https://cms.newsonafrica.com` |
| `NOA_R2_ACCOUNT_ID`, `NOA_R2_ACCESS_KEY_ID`, `NOA_R2_SECRET_ACCESS_KEY` | **empty until the owner creates the R2 token** |
| `NOA_R2_BUCKET`, `NOA_R2_PUBLIC_DOMAIN` | `noa-media-prod`, `https://media.newsonafrica.com` |

What `WORDPRESS_CONFIG_EXTRA` sets: the multisite constants (`MULTISITE`, `SUBDOMAIN_INSTALL=false`, `DOMAIN_CURRENT_SITE`, …), `DISALLOW_FILE_EDIT`, `DISABLE_WP_CRON` (real cron runs in the sidecar), `FORCE_SSL_ADMIN`,
`WP_ENVIRONMENT_TYPE=production`, `WP_MEMORY_LIMIT=256M`, `WP_POST_REVISIONS=25`, automatic minor core updates, and the
`ADVMO_CLOUDFLARE_R2_*` constants. Those constants are defined only when all three R2 env vars are set, and they always override the DB.

Inline config files in the compose (`content:` blocks):
- `php/noa.ini`: 256M memory, 64M upload/post, `expose_php=Off`, secure session cookies.
- `apache/noa.conf`: multisite subdirectory rewrites, `MaxRequestWorkers 12`, denies `xmlrpc.php`, `wp-config.php`, `readme.html`, `license.txt`.
- `mu-plugins/noa-hardening.php`: `noindex` on HTML and REST, `blog_public=0`, XML-RPC off, 5 failed logins per IP per 15 min network-wide
  (uses `CF-Connecting-IP`), and a generic login error.

> **Coolify quirk:** Coolify strips `content:` blocks out of `docker_compose_raw` into *File Storage* records
> (`local_file_volumes`), and **does not overwrite them** when the compose changes. To change one of these files, edit it in
> Coolify UI → service → Storages, or update the `LocalFileVolume` and call `saveStorageOnServer()`. Changing the compose
> alone silently keeps the old file. Also, the `PATCH /services/{uuid}` API ignored `docker_compose_raw` in v4.7.5.

Plugins (pinned, auto-update off, **network-activated**):
- `advanced-media-offloader` 4.7.3: R2 offload. Chosen because it explicitly supports R2, offloads all
  sizes and rewrites `srcset`, has bulk offload (`wp advmo offload`), per-file retry, and a path prefix. It was updated 2026-11-08 and is tested on WP 7.1.4.
- `wp-graphql` 2.28.0: the reader app queries `/graphql` (84 call sites).
- Theme: `twentytwentyfive` only (headless; no page builders). Sample content was removed. Akismet and Hello Dolly come back
  (inactive) whenever the container is recreated, because the image entrypoint re-seeds missing bundled plugins into `wp-content`. They are harmless while inactive.

Offloader policy (`advmo_settings`): `cloud_provider=cloudflare_r2`, `retention_policy=0` (**retain local files**),
`mirror_delete=0` (**deleting in WP never deletes in R2**), `object_versioning=1`. Settings are per site: `path_prefix` is
`editions/main`, `editions/sz`, `editions/za`, `editions/ng`. Local uploads for editions live in `uploads/sites/<id>/`.

Volumes:
- `fv3fqo7fe0dryfdgho4xcceg_noa-wp-content` → `/var/www/html/wp-content` (plugins, themes, local media copies).
- `mysql-data-pilolo1nw5krlso5azw5u9hl` → `/var/lib/mysql`.
- WordPress core is **not** persisted. It comes from the image on every deploy, and `wp-config.php` is generated from env.

## 5. Cloudflare R2 (configured 2026-11-16)

The VM's Cloudflare token has no R2 permissions, and the only R2 S3 key on the box is scoped to another bucket, so these are manual steps:

1. Create bucket `noa-media-prod` (location: automatic). Leave the `r2.dev` public URL **disabled**.
2. Bucket → Settings → Custom Domains → add `media.newsonafrica.com` (Cloudflare creates the DNS record).
3. Optional: CORS GET/HEAD from `https://app.newsonafrica.com` and `https://cms.newsonafrica.com`.
4. Create an R2 API token: **Object Read & Write**, scoped to **`noa-media-prod` only**, with no TTL or with a reminder set.
5. Save the key ID and secret as root-only files `/srv/eljaymedia/secrets/newsonafrica/r2-access-key-id` and `r2-secret-access-key`
   (via `read -rsp`, never in chat), then run `sudo /srv/eljaymedia/infra/scripts/noa-r2-apply.sh` (copy in this directory). It
   validates the lengths, sets `NOA_R2_ACCOUNT_ID`/`NOA_R2_ACCESS_KEY_ID`/`NOA_R2_SECRET_ACCESS_KEY` in Coolify and restarts, printing only hashes.
6. Optional hardening: a bucket lock rule (or lifecycle rule for retention) on `editions/` to stop bulk deletes, and a cache rule on
   `media.newsonafrica.com` with Edge TTL ≥ 1 month (object versioning gives every upload a unique key).
7. Re-run the media checks in section 9 (rows 6–8, 11).

Database backups do **not** go to this bucket (see section 6).

## 6. Backups and restore

| Data | Mechanism | Off-server | Verified |
|---|---|---|---|
| MySQL `newsonafrica_wp` | Coolify scheduled backup `xcfs5spxy0iabnjd5exclxtz`, daily 01:15, 7 local / 30 on S3 | Coolify S3 storage "Cloudflare R2 Backups" (private bucket `eljaymedia-coolify-backups`) | 2026-11-15: dump uploaded (`s3_uploaded=t`), restored into a disposable MySQL with `restore-test.sh`: tables, options, users and posts match |
| `wp-content` + `secrets/newsonafrica` | `backup_runtime_data.py` source `noa-wp-content` (nightly 02:47, GPG-encrypted, 7 days), then `backup-offhost` (03:30) | yes (existing off-host job) | 2026-11-15: test run ok (23.6 MB → 10.5 MB encrypted) |
| Media | R2 `noa-media-prod`, with local copies retained in `wp-content` | n/a | 2026-11-16: offload and serve verified |
| Compose / file storages | Coolify DB dump (`coolify-db.dump` in the runtime-data backup) + this repo | yes | |

Restoring MySQL:
```bash
# latest local dump (or fetch it from the S3 path data/coolify/backups/databases/root-team-0/noa-wp-mysql-<uuid>/)
D=/data/coolify/backups/databases/root-team-0/noa-wp-mysql-pilolo1nw5krlso5azw5u9hl
F=$(ls -t $D/*.dmp | head -1)
docker exec -i -e MYSQL_PWD="$(cat /srv/eljaymedia/secrets/newsonafrica/mysql-root-password)" \
  pilolo1nw5krlso5azw5u9hl mysql -uroot newsonafrica_wp < "$F"
```
Rehearse it first with `sudo bash restore-test.sh` (disposable container, `--network none`).

## 7. Operations

- WP-CLI: `sudo /srv/eljaymedia/infra/scripts/noa-wp-cli.sh <args>` (copy in this directory). It runs the pinned CLI image as uid 33
  with the live container's env. **Do not use `--prompt`** for passwords: WP-CLI echoes the expanded command, including the value.
- Admin: `noa-admin`. The password is in `/srv/eljaymedia/secrets/newsonafrica/wp-admin-password` (root-only).
- WP-CLI on an edition: add `--url=https://cms.newsonafrica.com/<cc>/`. New edition: `wp site create --slug=<cc> --title=...`
  (**omit `--email`**, which creates a new admin user), then `wp user set-role noa-admin administrator --url=...`, set its
  `advmo_settings` prefix, and add `/<cc>/` to `NOA_CRON_PATHS`.
- Health checks: `wordpress` curls `/wp-login.php` (200/302, `Host: cms.newsonafrica.com`) every 30s. `wp-cron` hits each site's
  `wp-cron.php` listed in `NOA_CRON_PATHS` (default `/ /sz/ /za/ /ng/`) every 60s
  and has its own health check. MySQL uses Coolify's built-in check. Restart policy `unless-stopped`. Memory caps: WP 768m, cron 64m, MySQL 640m.
- Monitoring: add an Uptime Kuma HTTP monitor for `https://cms.newsonafrica.com/wp-json/` (not yet created).

## 8. Rollback

Nothing pre-existing was changed. To remove everything (see `/srv/eljaymedia/backups/noa-cms-publish-20261115_205710/ROLLBACK.txt`):
1. Delete the DNS CNAME `cms.newsonafrica.com`, and remove the `cms.newsonafrica.com` ingress from tunnel 38a98bd6 (the backup holds the v13 config).
2. In Coolify, stop or delete the service `fv3fqo7fe0dryfdgho4xcceg` and the database `pilolo1nw5krlso5azw5u9hl`. Their volumes are kept unless you delete them.
3. Remove the `noa-wp-content` entries from `/srv/eljaymedia/apps/backups/backup_runtime_data.py` (a `.bak-noa-wp-*` copy sits beside it).

## 9. Verification (2026-11-15)

| # | Test | Result |
|---|---|---|
| 1 | WordPress starts and stays healthy | PASS |
| 2 | WP ↔ MySQL over the internal network (utf8mb4) | PASS |
| 3 | Admin login over HTTPS, secure cookies, dashboard 200 | PASS |
| 4 | Article created and published (category, tag, featured image) | PASS |
| 5 | Image upload through the WP media pipeline (5 sizes + srcset) | PASS |
| 6 | Image and sizes stored in R2 | PASS (2026-11-16, all 4 sites; before credentials existed the offloader failed safe and kept local files) |
| 7 | Public URL on `media.newsonafrica.com` | PASS (REST `source_url`, GraphQL `sourceUrl`/`srcSet`) |
| 8 | Image over HTTPS | PASS (28/28 objects 200 with the right content type) |
| 9 | PDF upload and serving | PASS (`application/pdf` from R2 on every site) |
| 10 | REST: `/wp-json/`, posts, categories, tags, media; `_embed` featured media and author; drafts/future → 401 | PASS |
| 11 | Media valid after a WordPress redeploy (container replaced) | PASS (all R2 URLs still 200) |
| 12 | MySQL data persists across restart | PASS |
| 13 | Off-server DB backup | PASS |
| 14 | DB restore into a disposable instance | PASS |
| 15 | `app.newsonafrica.com` and source WP (REST and GraphQL) unaffected | PASS |
| + | Scheduled post published by the cron sidecar (WP-Cron disabled) | PASS |
| + | XML-RPC / readme / wp-config → 403; login throttle blocks the 6th failure; generic login error | PASS |

All test content and media were deleted afterwards (0 posts, 0 upload files).

Multisite conversion (2026-11-16, backup `/srv/eljaymedia/backups/noa-multisite-20261116_050545/`):

| Test | Result |
|---|---|
| Network created (subdirectory); sites `sz`=2, `za`=3, `ng`=4 | PASS |
| Each edition: `/<cc>/wp-json/` name and home, `/<cc>/graphql` `generalSettings`, posts 200, `/<cc>/wp-admin` → https | PASS |
| XML-RPC 403 and `noindex` on every edition | PASS |
| Login on `/sz/wp-login.php`, edition dashboard 200, network admin 200 | PASS |
| Post with featured image on `/sz`: 5 sizes in `uploads/sites/2/`, image 200 via `/sz/wp-content/…`, REST `_embed` author, GraphQL `featuredImage` | PASS |
| Edition isolation (the `/sz` post is not on `/` or `/za`) | PASS |
| Scheduled post on `/za` published by the cron sidecar | PASS |
| Offloader without R2 credentials fails safe (local copy kept) | PASS |

R2 (2026-11-16, after `noa-r2-apply.sh`): on each site an image (original + 5 sizes) and a PDF were offloaded to
`editions/<main|sz|za|ng>/YYYY/MM/<version>/…`. All were served over HTTPS from `media.newsonafrica.com`, local copies were kept,
and the URLs survived a container replacement. Test posts were deleted in WP and the 28 test objects were deleted from R2 (bucket empty).
Note: the key includes the offloader's object-version folder, not `sites/<id>`. Media responses are `cf-cache-status: DYNAMIC`
(not edge-cached). Add a Cache Rule for `media.newsonafrica.com` (eligible for cache, long edge TTL), or remove the zone rule that bypasses it.

## 10. Source site: what the migration must handle

The source is a **subdirectory WordPress multisite**:

| Site | Path | Name | Posts | Pages | Media |
|---|---|---|---|---|---|
| 1 | `/` | News On Africa | 3 | 1 | 3 |
| 2 | `/sz` | News On Africa Eswatini Edition | **819** | 0 | 266 |
| 3 | `/za` | News On Africa South African Edition | 4 | 1 | 4 |
| 4 | `/ng` | News on Africa Nigeria Edition | 1 | 1 | 1 |

(`/ke` redirects to the reader app.) Plugins visible through REST: WPGraphQL, Yoast SEO (`yoast/v1`), Easy MCP AI.
The new install is now a matching subdirectory network (blog IDs 1–4 as above).

Reader-app dependencies that change at cutover (names only):
- `WORDPRESS_API_URL` (set in Coolify, currently `https://newsonafrica.com`)
- `NEXT_PUBLIC_WP_{SZ,ZA,NG,KE}_GRAPHQL`, `NEXT_PUBLIC_WP_{SZ,ZA,NG,KE}_REST_BASE` (per-edition endpoints; defaults assume `/<cc>/graphql`)
- `WORDPRESS_GRAPHQL_AUTH_HEADER`, `WORDPRESS_API_AUTH_HEADER` (application-password auth for previews or private data)
- `WORDPRESS_WEBHOOK_SECRET`, `WORDPRESS_PREVIEW_SECRET`
- `app/api/webhooks/wordpress/route.ts`: WP must POST `{action, country, id}` with `x-webhook-secret` or `x-wp-signature: sha256=<hmac>`.
  This drives `revalidateTag` and the Supabase `content_index` search sync (`lib/content-sync`). The new CMS needs the same sender.
  It probably lives in a plugin or mu-plugin on the cPanel site; copy it.
- Image domains: `next.config` remote patterns must allow `media.newsonafrica.com`.

## 11. Migration runbook (content: not yet authorized)

1. **Network shape: done (2026-11-16).** Subdirectory network with `sz`=2, `za`=3, `ng`=4, so `uploads/sites/<id>` paths and the
   reader's per-edition endpoints line up. Before importing, confirm the source's blog IDs still match (`wp site list` on cPanel).
   The import replaces `wp_site`/`wp_blogs`/`wp_sitemeta`, so re-check `DOMAIN_CURRENT_SITE`, `site_admins` and the network-activated
   plugins afterwards, and re-apply the per-site `advmo_settings` prefixes if the source's options overwrite them.
2. Freeze editing on the source (maintenance notice for editors).
3. Export from cPanel: `mysqldump --single-transaction` of the network DB, and `wp-content/uploads` (including `sites/*`).
   Inventory the plugins and the mu-plugin that sends the reader webhook.
4. Import into `newsonafrica_wp` (the table prefix must match the source's, or rename tables). Then run
   `wp search-replace 'https://newsonafrica.com' 'https://cms.newsonafrica.com' --network --all-tables --precise --skip-columns=guid`,
   and do the same for the `/sz` `/za` `/ng` home and siteurl values in `wp_blogs` / `wp_site` / `wp_<id>_options`.
5. Copy the uploads into the `noa-wp-content` volume, then run `wp advmo offload` per site
   (`--url=https://cms.newsonafrica.com/sz/` etc.). Check every attachment ID and its sizes in R2, then spot-check `srcset`.
6. Install the same versions of WPGraphQL, Yoast plus `wp-graphql-yoast` (if the reader uses SEO fields), and the webhook sender.
   Reset all user passwords or application passwords.
7. Point a reader **preview** at the new endpoints (`NEXT_PUBLIC_WP_*_GRAPHQL=https://cms.newsonafrica.com/<cc>/graphql`) and compare
   article, category and author pages, plus search sync.
8. Cutover (needs separate authorization): switch the reader env, then lower TTL and decide what `newsonafrica.com` itself becomes
   (today it is cPanel WordPress, and it also carries mail on `_dc-mx`).
9. Keep the cPanel site read-only for at least 30 days as a rollback, and keep local media copies (`retention_policy=0`) until
   restores from R2 are proven.

## 12. Rebuilding on a different VM

1. Install Coolify (≥ a PHP2Shell-patched release) and attach the server. Create project `newsonafrica` / env `production`.
2. Create a MySQL database resource: image pinned as above, DB `newsonafrica_wp`, user `noa_wp`, no public port, and the conf from
   section 4 (`utf8mb4_unicode_ci`, `innodb_buffer_pool_size=256M`).
3. Create a Docker Compose service from `docker-compose.yml`. Enable *Connect to predefined network*. Set the FQDN to
   `http://cms.newsonafrica.com` and all env vars from section 4 (`WORDPRESS_DB_HOST=<new mysql uuid>:3306`).
4. Restore the MySQL dump (section 6), then restore `wp-content` (decrypt the `noa-wp-content.tar.gpg` from the off-host backup into
   the new volume, owned by `33:33`).
5. Point the tunnel or DNS for `cms.newsonafrica.com` at the new server. Media URLs do not change (R2 custom domain).
6. Run the section 9 checks.

## Reader webhook (NOA-88 / NOA-191)

`mu-plugins/noa-reader-webhook.php` tells the reader when a story is published,
updated, unpublished or deleted. The reader then revalidates its cache and
syncs the Supabase `content_index`, which is what drives search and Most read.

- Install it by copying the file to `wp-content/mu-plugins/` (on the persistent
  `noa-wp-content` volume). It's network-wide and needs no activation.
- Configure it with network options. The secret is stored root-only at
  `/srv/eljaymedia/secrets/newsonafrica/reader-webhook-secret`, and the same
  value is set as the reader's `WORDPRESS_WEBHOOK_SECRET` (a runtime-only
  Coolify variable):

  ```sh
  sudo noa-wp-cli.sh site option update noa_reader_webhook_url https://app.newsonafrica.com/api/webhooks/wordpress
  sudo cat /srv/eljaymedia/secrets/newsonafrica/reader-webhook-secret | tr -d '\n' \
    | sudo noa-wp-cli.sh site option update noa_reader_webhook_secret
  ```
- Each request is signed with HMAC-SHA256 (`x-wp-signature`) and sent
  non-blocking, so an unreachable reader never slows publishing.
- The reader needs `SUPABASE_SERVICE_ROLE_KEY` set at runtime to write the
  index. Without it the webhook still refreshes the cache, but the index
  sync fails and is logged.
