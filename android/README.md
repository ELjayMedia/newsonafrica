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
