# News On Africa - Android TWA Setup

This guide will help you create an Android Trusted Web Activity (TWA) wrapper for the News On Africa PWA.

## Prerequisites

1. **Node.js** (v14 or higher)
2. **Java JDK** (v8 or higher)
3. **Android Studio** (latest version)
4. **Git** (for version control)

## Quick Setup

### 1. Install Dependencies

\`\`\`bash
# Install Bubblewrap CLI globally
npm install -g @bubblewrap/cli

# Initialize Bubblewrap (downloads Android SDK)
bubblewrap init
\`\`\`

### 2. Generate Keystore

\`\`\`bash
# Make the script executable
chmod +x generate-keystore.sh

# Run the keystore generation
./generate-keystore.sh
\`\`\`

### 3. Build the TWA

\`\`\`bash
# Make the setup script executable
chmod +x setup-twa.sh

# Run the setup
./setup-twa.sh
\`\`\`

### 4. Build for Production

\`\`\`bash
# Make the build script executable
chmod +x build-twa.sh

# Build the signed AAB
./build-twa.sh
\`\`\`

## Manual Setup Steps

If you prefer to run commands manually:

### 1. Initialize Project

\`\`\`bash
bubblewrap init --manifest=./twa-manifest.json
\`\`\`

### 2. Build Project

\`\`\`bash
bubblewrap build
\`\`\`

### 3. Open in Android Studio

1. Open Android Studio
2. Select "Open an existing Android Studio project"
3. Navigate to the generated `app` folder
4. Open the project

### 4. Generate AAB

In Android Studio:
1. Go to `Build` → `Generate Signed Bundle / APK`
2. Select `Android App Bundle`
3. Use the keystore you generated
4. Choose `release` build variant
5. Build the AAB

## Configuration Details

### App Shortcuts

The TWA includes three app shortcuts:
- **Home**: Direct link to the homepage
- **Explore**: Quick access to search functionality
- **Bookmarks**: Direct access to saved articles

### Theme Configuration

- **Theme Color**: #000000 (Black)
- **Navigation Color**: #000000 (Black)
- **Background Color**: #ffffff (White)
- **Display Mode**: Standalone

### Fallback Strategy

The app uses Custom Tabs as a fallback if the PWA is not available.

## Publishing to Google Play Store

### 1. Prepare for Upload

1. Ensure your AAB is signed with the production keystore
2. Test the app thoroughly on different devices
3. Prepare store listing materials (screenshots, descriptions, etc.)

### 2. Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app or select existing app
3. Upload the AAB file
4. Fill in the required store listing information
5. Submit for review

### 3. Digital Asset Links

Add this to your PWA's `/.well-known/assetlinks.json`:

\`\`\`json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.newsonafrica.twa",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
\`\`\`

Get your SHA256 fingerprint with:
\`\`\`bash
keytool -list -v -keystore android.keystore -alias android
\`\`\`

## Troubleshooting

### Common Issues

1. **Build Fails**: Ensure Java JDK is properly installed and JAVA_HOME is set
2. **Keystore Issues**: Make sure the keystore path in twa-manifest.json is correct
3. **PWA Not Loading**: Verify the start URL is accessible and the web manifest is valid

### Updating the App

1. Update the `appVersionCode` and `appVersionName` in `twa-manifest.json`
2. Rebuild the project with `bubblewrap build`
3. Generate a new signed AAB
4. Upload to Play Console as an update

## Support

For issues with:
- **Bubblewrap**: Check the [official documentation](https://github.com/GoogleChromeLabs/bubblewrap)
- **Android Development**: Refer to [Android Developer Docs](https://developer.android.com/)
- **Play Store**: Visit [Play Console Help](https://support.google.com/googleplay/android-developer/)
\`\`\`

Finally, let's create a validation script:
