# Play Store Automation Setup

## 1. Create Google Play Service Account

### Step 1: Enable Google Play Developer API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google Play Developer API"

### Step 2: Create Service Account

1. Go to IAM & Admin → Service Accounts
2. Click "Create Service Account"
3. Name: `play-store-deployment`
4. Create and download JSON key file

### Step 3: Grant Permissions in Play Console

1. Go to [Play Console](https://play.google.com/console)
2. Setup → API access
3. Link the Google Cloud project
4. Grant permissions to the service account:
   - Release manager
   - View app information and download bulk reports

## 2. Setup GitHub Secrets

Add these secrets to your GitHub repository:

\`\`\`
KEYSTORE_BASE64=<base64 encoded keystore file>
KEYSTORE_PASSWORD=<your keystore password>
KEY_ALIAS=<your key alias>
KEY_PASSWORD=<your key password>
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<service account JSON content>
\`\`\`

### Generate base64 keystore:

\`\`\`bash
base64 -i android.keystore | pbcopy # macOS
base64 -w 0 android.keystore # Linux
\`\`\`

## 3. Deployment Commands

### Manual Deployment

\`\`\`bash

# Build and deploy

./deploy-twa.sh

# Deploy with fastlane

fastlane android internal
\`\`\`

### Automated Deployment

\`\`\`bash

# Tag a release to trigger GitHub Actions

git tag v1.0.0
git push origin v1.0.0
\`\`\`

## 4. Download Locations

### Local Development

- **Debug APK**: \`app/build/outputs/apk/debug/app-debug.apk\`
- **Release APK**: \`app/build/outputs/apk/release/app-release.apk\`
- **Release AAB**: \`app/build/outputs/bundle/release/app-release.aab\`

### GitHub Actions Artifacts

1. Go to Actions tab in your repository
2. Click on the latest workflow run
3. Download artifacts:
   - \`twa-apk\` (for testing)
   - \`twa-aab\` (for Play Store)

### Release Directory

After running \`./deploy-twa.sh\`:

- Files copied to: \`releases/v{version}/\`

## 5. Testing the APK

### Install via ADB

\`\`\`bash

# Enable USB debugging on your device

adb install app-release.apk
\`\`\`

### Install via File Manager

1. Copy APK to device
2. Enable "Install from unknown sources"
3. Tap APK file to install

## 6. Play Store Tracks

- **Internal**: For team testing
- **Alpha**: For limited external testing
- **Beta**: For broader testing
- **Production**: For all users

### Promote between tracks:

\`\`\`bash
fastlane android promote_to_alpha
fastlane android promote_to_beta
fastlane android promote_to_production
\`\`\`
\`\`\`

Finally, let's create a quick install script for testing:
