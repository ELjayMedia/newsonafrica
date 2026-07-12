# News on Africa Android TWA

Bubblewrap-generated Trusted Web Activity wrapper for the production PWA at
`https://app.newsonafrica.com`.

## Identity

- Package/application ID: `com.newsonafrica.app`
- App name: `News on Africa`
- Launcher name: `News Africa`
- Start URL: `https://app.newsonafrica.com/`
- Version: `versionCode 1`, `versionName "1"`

## Local Debug Build

Prerequisites:

- JDK 17
- Android SDK platform 36
- Android build-tools 34.0.0 or newer

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

Smoke-test home, article, category, search, and privacy navigation. Release
signing and the real Digital Asset Links fingerprint are tracked separately in
NOA-136, so do not commit keystores, APKs, or AABs.

## Signed Release AAB

Release builds require signing values through environment variables or matching
Gradle properties. Start from the non-secret template:

```bash
cp ../scripts/android-release-env.example /tmp/noa-android-release-env
```

Edit the copied file with the private keystore path and passwords, then source
it before building:

```bash
source /tmp/noa-android-release-env
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
