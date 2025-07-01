# Capacitor Setup

This project can run as a native application using [Capacitor](https://capacitorjs.com/).

## Installation

1. Install Capacitor packages:

\`\`\`bash
npm install @capacitor/core @capacitor/cli
\`\`\`

2. Initialize Capacitor with the provided configuration:

\`\`\`bash
npx cap init com.newsonafrica.app "NewsOnAfrica" --web-dir=dist
\`\`\`

3. Add desired platforms:

\`\`\`bash
npx cap add ios
npx cap add android
\`\`\`

## Common Plugins

Install plugins for native features:

\`\`\`bash
npm install @capacitor/camera @capacitor/geolocation @capacitor/local-notifications
npx cap sync
\`\`\`

Update `capacitor.config.ts` to enable these plugins:

\`\`\`ts
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.newsonafrica.app',
  appName: 'NewsOnAfrica',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    LocalNotifications: {
      sound: 'beep.wav'
    },
  },
}

export default config
\`\`\`

For iOS add usage descriptions (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`) to `ios/NewsOnAfrica/Info.plist`. On Android ensure camera and location permissions are present in `AndroidManifest.xml` and add `POST_NOTIFICATIONS` for Android 13+ if using local notifications.

## Exporting Web Assets

Run the helper script to export the Next.js build and sync platforms:

\`\`\`bash
./export-capacitor.sh
\`\`\`

The script builds the project, exports static files to the `dist` directory, runs `npx cap sync`, and copies the assets to each native platform.
