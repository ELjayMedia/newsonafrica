#!/bin/bash

# News On Africa - Credential Setup Script
echo "🚀 Setting up Apple Developer and Google Play Console credentials..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create credentials directory
mkdir -p credentials

echo -e "${BLUE}📱 Apple Developer Setup${NC}"
echo "============================================"
echo "1. Go to https://developer.apple.com/account/"
echo "2. Sign in with your Apple Developer account"
echo "3. Navigate to 'Certificates, Identifiers & Profiles'"
echo "4. Create an App ID with bundle identifier: com.newsonafrica.app"
echo "5. Note your Team ID from the top right corner"
echo ""
echo -e "${YELLOW}Required Information:${NC}"
echo "- Apple ID (email): your-apple-id@example.com"
echo "- Team ID: Found in Apple Developer portal"
echo "- App Store Connect App ID: Create app in App Store Connect"
echo ""

echo -e "${BLUE}🤖 Google Play Console Setup${NC}"
echo "============================================"
echo "1. Go to https://play.google.com/console/"
echo "2. Create a new app or select existing app"
echo "3. Go to Setup > API access"
echo "4. Create a service account or use existing one"
echo "5. Download the JSON key file"
echo ""

echo -e "${BLUE}🔧 EAS CLI Setup${NC}"
echo "============================================"
echo "Installing EAS CLI..."
npm install -g @expo/eas-cli

echo "Logging into Expo..."
eas login

echo "Configuring project..."
eas build:configure

echo -e "${GREEN}✅ Basic setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update credentials/apple-credentials.json with your Apple info"
echo "2. Place your Google service account JSON as credentials/google-service-account.json"
echo "3. Run: ./scripts/configure-github-secrets.sh"
echo "4. Test with: eas build --platform all --profile preview"
