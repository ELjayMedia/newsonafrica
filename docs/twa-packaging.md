# TWA packaging for app stores (NOA-110)

How to wrap the News on Africa PWA in a Trusted Web Activity (TWA) with
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) and ship it to
the Google Play Store. `${SITE_URL}` below is the canonical production
origin (the `SITE_URL` / `NEXT_PUBLIC_SITE_URL` env var from `lib/env.ts`,
e.g. `https://newsonafrica.com`) — no live domain is required to prepare
any of this.

## Prerequisites (already in place)

- Installable PWA: `app/manifest.ts` (served at `${SITE_URL}/manifest.webmanifest`)
  with `display: standalone`, 192/512 `any` + `maskable` icons (NOA-109).
- Offline-capable service worker at `${SITE_URL}/sw.js` (NOA-108) — Play
  quality guidelines expect the app to work offline.
- Digital Asset Links file at `${SITE_URL}/.well-known/assetlinks.json`
  (this repo: `public/.well-known/assetlinks.json`). The root
  `middleware.ts` matcher explicitly excludes `/.well-known/…` so the file
  is served statically without auth-session processing.

## Suggested package ID

`com.newsonafrica.app` (matches the legacy manifest's
`related_applications` entry). Reverse-DNS, owned domain, no hyphens.

## 1. Install Bubblewrap

```bash
npm i -g @bubblewrap/cli
bubblewrap doctor   # installs/locates JDK + Android SDK on first run
```

## 2. Initialise the Android project

Run outside this repo (the Android project is not committed here):

```bash
bubblewrap init --manifest="${SITE_URL}/manifest.webmanifest"
```

Answer the prompts; the manifest maps to TWA settings as follows:

| Web manifest field (`app/manifest.ts`)  | TWA / Bubblewrap setting              |
| --------------------------------------- | ------------------------------------- |
| `name` ("News on Africa")               | App name (launcher + Play listing)    |
| `short_name`                            | Short launcher name                   |
| `start_url` (`/`)                       | Host + start path of the activity     |
| `theme_color` (brand green `#16a34a`)   | Status-bar color                      |
| `background_color` (white)              | Splash-screen background              |
| `icons` 512 `any` / `maskable`          | Launcher icon / adaptive icon         |
| `display: standalone`                   | `displayMode` (fullscreen chrome-less) |
| `orientation: portrait-primary`         | Locked orientation                    |
| Package id                              | `com.newsonafrica.app` (enter manually) |

## 3. Signing key

Bubblewrap offers to create a keystore during `init`. Either:

- **Play App Signing (recommended):** upload with your generated keystore;
  Google re-signs releases. The fingerprint that must go into
  `assetlinks.json` is then the **App signing key certificate** from Play
  Console → Setup → App integrity (NOT your upload key).
- **Self-managed key:** keep `android.keystore` out of git, back it up, and
  use its fingerprint directly.

Get a local keystore's SHA-256 fingerprint:

```bash
keytool -list -v -keystore android.keystore -alias android | grep SHA256
# or, once initialised:
bubblewrap fingerprint list
```

## 4. Update the asset links (REQUIRED before release)

`public/.well-known/assetlinks.json` currently contains a **placeholder**
all-zero `sha256_cert_fingerprints` value — the TWA will show the browser
URL bar until it is replaced with the real signing-certificate fingerprint
from step 3. Replace the placeholder, deploy, then verify:

```bash
curl "${SITE_URL}/.well-known/assetlinks.json"
# and Google's validator:
# https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=${SITE_URL}&relation=delegate_permission/common.handle_all_urls
```

If you use Play App Signing you will typically list **both** the app
signing key and the upload/debug key fingerprints in the array while
testing.

## 5. Build & test

```bash
bubblewrap build            # produces app-release-signed.apk + .aab
bubblewrap install          # side-load the APK onto a connected device
```

Verify: app opens full-screen (no URL bar) once the deployed asset links
match, offline fallback renders in airplane mode, and the splash screen
uses the brand colors.

## 6. Release

1. Upload the `.aab` to Play Console (closed testing track first).
2. Confirm the App signing certificate fingerprint is in the deployed
   `assetlinks.json` (step 4) — re-check after enabling Play App Signing.
3. Listing assets: reuse `public/icons/icon-512.png` (hi-res icon) and add
   screenshots per form factor.
4. Later web updates ship automatically (the TWA loads the live site);
   rebuild/re-upload only when the manifest identity (name, colors, icons,
   package id) or Bubblewrap/Android target requirements change —
   `bubblewrap update` then `bubblewrap build`.

## iOS note

TWA is Android-only. For the App Store the equivalent path is a thin
WKWebView/`PWABuilder` wrapper — out of scope for this story; the legacy
manifest's `related_applications` iTunes entry is a placeholder only.
