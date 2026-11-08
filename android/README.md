# News on Africa Android TWA

Bubblewrap-generated Trusted Web Activity wrapper for the production PWA at
`https://app.newsonafrica.com`.

## Identity

- Package/application ID: `com.newsonafrica.app`
- App name: `News on Africa`
- Launcher name: `News Africa`
- Start URL: `https://app.newsonafrica.com/`
- Local default version: `versionCode 3`, `versionName "1.0.2"`; CI overrides both.

## Local Debug Build

Prerequisites:

- JDK 17
- Android SDK platform 36
- Android build-tools 35.0.0 (installed explicitly by the workflows)

Build the debug APK:

```bash
./gradlew assembleDebug
```

The debug APK is written to:

```text
app/build/outputs/apk/debug/app-debug.apk
```

Install and launch on a connected Android device:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.newsonafrica.app/.LauncherActivity
```

Smoke-test home, article, category, search, and privacy navigation. CI also
builds the debug APK without signing secrets. Do not commit keystores, APKs, or
AABs.

## Signed Release AAB

Release builds require signing values through environment variables or matching
Gradle properties. The `scripts/setup-android-release-secrets.sh` script
generates a keystore and prints the GitHub secrets to set.

Start from the non-secret template:

```bash
cp ../scripts/android-release-env.example /tmp/noa-android-release-env
```

Edit the copied file with the private keystore path and passwords, then source
it before building:

```bash
source /tmp/noa-android-release-env
export NOA_ANDROID_VERSION_CODE=4
export NOA_ANDROID_VERSION_NAME=1.0.3
./gradlew clean bundleRelease
```

Required values:

- `NOA_ANDROID_KEYSTORE`: absolute path to the upload/app-signing keystore,
  stored outside this repository.
- `NOA_ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `NOA_ANDROID_KEY_ALIAS`: signing key alias, for example `noa_upload`.
- `NOA_ANDROID_KEY_PASSWORD`: key password.
- `NOA_ANDROID_KEYSTORE_TYPE`: optional keystore type, for example `pkcs12`.

For PKCS12 keystores, Java uses the same password for the store and key; set
`NOA_ANDROID_KEY_PASSWORD` to the same value as
`NOA_ANDROID_KEYSTORE_PASSWORD`.

Set `NOA_ANDROID_VERSION_CODE` to a fresh integer from 1 through 2100000000
above every code already uploaded to Google Play. Set
`NOA_ANDROID_VERSION_NAME` to the user-visible version. Matching Gradle
properties (`-PNOA_ANDROID_VERSION_CODE=4`, for example) are also supported.
Unset overrides preserve the local defaults shown above.

For GitHub builds, **Android Release** uses the version tag or manual
`version_name` input, and starts the code at the workflow run number plus 3.
When publishing, the preflight raises an automatic code above the highest
existing Play bundle code when needed. Manual runs can set `version_code`
explicitly; an already-used override is rejected. Manual runs default to
build-only; enable `publish_to_play` to upload, or push an `android-v<version>`
tag to publish to internal testing. Publishing runs verify Google Play access
and version-code availability before building. See
[`docs/android-release-secrets.md`](../docs/android-release-secrets.md) for the
required secrets, track IDs, and release-note filenames.

The signed bundle is written to:

```text
app/build/outputs/bundle/release/app-release.aab
```

Verify the bundle is signed:

```bash
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

Print the local keystore fingerprint:

```bash
keytool -list -v \
  -keystore "$NOA_ANDROID_KEYSTORE" \
  -alias "$NOA_ANDROID_KEY_ALIAS" \
  -storepass "$NOA_ANDROID_KEYSTORE_PASSWORD" |
  sed -n 's/^[[:space:]]*SHA256: //p'
```

Use the certificate fingerprint that signs the installed app in
`public/.well-known/assetlinks.json`. For Google Play App Signing, that is the
Play Console app-signing certificate from Setup -> App integrity; it can differ
from the upload key used to produce this AAB.

