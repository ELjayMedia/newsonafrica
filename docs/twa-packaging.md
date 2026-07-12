# TWA packaging for app stores (NOA-132)

How to wrap the News on Africa PWA in a Trusted Web Activity (TWA) with
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) and ship it to
the Google Play Store. The Android wrapper project is committed in `android/`
and points at the canonical production app origin:
`https://app.newsonafrica.com`.

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

## Committed wrapper project

NOA-132 generated the wrapper at `android/` from:

```bash
bubblewrap init \
  --manifest="https://app.newsonafrica.com/manifest.webmanifest" \
  --directory="android"
```

Current wrapper identity:

- Package/application ID: `com.newsonafrica.app`
- App name: `News on Africa`
- Launcher name: `News Africa`
- Host/start URL: `https://app.newsonafrica.com/`
- Display/orientation: `standalone`, `portrait-primary`
- Version metadata: `versionCode 1`, `versionName "1"`
- Signing key placeholder: `android.keystore` / alias `android`

The real release keystore and deployed Digital Asset Links fingerprint are
owned by NOA-136. Do not commit keystores, APKs, AABs, `local.properties`, or
Gradle build output.

## 1. Install Bubblewrap

```bash
npm i -g @bubblewrap/cli
bubblewrap doctor   # installs/locates JDK + Android SDK on first run
```

Bubblewrap expects JDK 17. The generated project currently compiles with
Android `compileSdkVersion 36`, targets SDK 35, and Bubblewrap's signing tools
expect Android build-tools `34.0.0`.

## 2. Regenerate or update the Android project

The project is already committed under `android/`. Regenerate only when the
manifest identity changes materially:

```bash
bubblewrap init \
  --manifest="https://app.newsonafrica.com/manifest.webmanifest" \
  --directory="android"
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
curl "https://app.newsonafrica.com/.well-known/assetlinks.json"
# and Google's validator:
# https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://app.newsonafrica.com&relation=delegate_permission/common.handle_all_urls
```

If you use Play App Signing you will typically list **both** the app
signing key and the upload/debug key fingerprints in the array while
testing.

## 5. Build & test

```bash
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.newsonafrica.app/.LauncherActivity
```

Verify: app opens the live News on Africa home screen, article/category/search
and privacy navigation work, real content renders, and the splash screen uses
the brand colors. The debug APK uses Android debug signing and may still show
browser UI until NOA-136 replaces the placeholder asset-links fingerprint with
the real signing certificate fingerprint.

For release signing after NOA-136:

```bash
cd android
bubblewrap build
```

That produces release APK/AAB artifacts, which must stay out of git.

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
