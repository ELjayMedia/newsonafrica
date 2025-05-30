# Apple Developer and Google Play Console Credentials Setup

## 🍎 Apple Developer Setup

### Step 1: Apple Developer Account
1. **Enroll in Apple Developer Program**
   - Go to [Apple Developer](https://developer.apple.com/programs/)
   - Cost: $99/year
   - Complete enrollment process

### Step 2: App Store Connect Setup
1. **Create App in App Store Connect**
   - Go to [App Store Connect](https://appstoreconnect.apple.com/)
   - Click "My Apps" → "+" → "New App"
   - Fill in app information:
     - **Name**: News On Africa
     - **Bundle ID**: com.newsonafrica.app
     - **SKU**: news-on-africa-ios
     - **Language**: English (U.S.)

2. **Get App Store Connect App ID**
   - After creating the app, note the App ID from the URL
   - Format: `https://appstoreconnect.apple.com/apps/{APP_ID}/appstore`

### Step 3: Get Required Credentials
1. **Apple ID**: Your Apple Developer account email
2. **Team ID**: 
   - Go to [Apple Developer Account](https://developer.apple.com/account/)
   - Found in top-right corner of the page
3. **App-Specific Password**:
   - Go to [Apple ID Account](https://appleid.apple.com/account/manage)
   - Sign in → App-Specific Passwords → Generate Password
   - Label it "Expo EAS Submit"

## 🤖 Google Play Console Setup

### Step 1: Google Play Console Account
1. **Create Developer Account**
   - Go to [Google Play Console](https://play.google.com/console/)
   - One-time fee: $25
   - Complete registration

### Step 2: Create App
1. **Create New App**
   - Click "Create app"
   - Fill in details:
     - **App name**: News On Africa
     - **Default language**: English (United States)
     - **App or game**: App
     - **Free or paid**: Free

### Step 3: API Access Setup
1. **Enable Google Play Android Developer API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable "Google Play Android Developer API"

2. **Create Service Account**
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Name: `expo-upload`
   - Description: `Service account for Expo app uploads`

3. **Generate Key**
   - Click on created service account
   - Go to "Keys" tab → "Add Key" → "Create new key"
   - Choose JSON format
   - Download and save securely

4. **Grant Permissions**
   - Go back to Google Play Console
   - Setup → API access
   - Link the service account
   - Grant permissions: "Release manager" or "Admin"

## 🔧 Configuration Files

### Update app.json
\`\`\`json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.newsonafrica.app"
    },
    "android": {
      "package": "com.newsonafrica.app"
    }
  }
}
\`\`\`

### Update eas.json
\`\`\`json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "$APPLE_ID",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "$APPLE_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
\`\`\`

## 🔐 GitHub Secrets Configuration

Add these secrets to your GitHub repository:

### Apple Secrets
- `APPLE_ID`: Your Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD`: Generated app-specific password
- `APPLE_TEAM_ID`: Your Apple Developer Team ID

### Google Secrets
- `GOOGLE_SERVICE_ACCOUNT_KEY`: Entire JSON content of service account key

### Expo Secrets
- `EXPO_TOKEN`: Access token from Expo dashboard

## 🚀 Testing the Setup

1. **Test Expo Build**
   \`\`\`bash
   eas build --platform all --profile preview
   \`\`\`

2. **Test Submission**
   \`\`\`bash
   eas submit --platform ios --latest
   eas submit --platform android --latest
   \`\`\`

## 🔍 Troubleshooting

### Common Issues

1. **Apple Certificate Issues**
   - Ensure certificates are valid
   - Check provisioning profiles
   - Verify bundle identifier matches

2. **Google Play API Issues**
   - Verify service account permissions
   - Check API is enabled
   - Ensure JSON key is valid

3. **Expo Token Issues**
   - Regenerate token if expired
   - Ensure token has correct permissions

### Useful Commands

\`\`\`bash
# Check EAS configuration
eas config

# List builds
eas build:list

# Check submission status
eas submit:list

# View logs
eas build:view [BUILD_ID]
\`\`\`

## 📞 Support Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Apple Developer Support](https://developer.apple.com/support/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
