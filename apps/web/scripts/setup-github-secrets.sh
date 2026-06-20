#!/bin/bash

echo "🔐 GitHub Secrets Setup for Play Store Automation"
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not found${NC}"
    echo -e "${YELLOW}💡 Install from: https://cli.github.com/${NC}"
    exit 1
fi

# Check if logged in to GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}🔐 Please login to GitHub...${NC}"
    gh auth login
fi

echo -e "${BLUE}📋 Setting up repository secrets...${NC}"

# Check if service account JSON exists
if [ ! -f "google-play-service-account.json" ]; then
    echo -e "${RED}❌ google-play-service-account.json not found${NC}"
    echo -e "${YELLOW}💡 Run ./scripts/setup-service-account.sh first${NC}"
    exit 1
fi

# Check if keystore exists
if [ ! -f "android.keystore" ]; then
    echo -e "${RED}❌ android.keystore not found${NC}"
    echo -e "${YELLOW}💡 Run ./generate-keystore.sh first${NC}"
    exit 1
fi

# Encode keystore to base64
echo -e "${YELLOW}🔄 Encoding keystore to base64...${NC}"
KEYSTORE_BASE64=$(base64 -w 0 android.keystore)

# Read service account JSON
SERVICE_ACCOUNT_JSON=$(cat google-play-service-account.json)

# Set GitHub secrets
echo -e "${YELLOW}🔐 Setting GitHub repository secrets...${NC}"

gh secret set KEYSTORE_BASE64 --body "$KEYSTORE_BASE64"
gh secret set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON --body "$SERVICE_ACCOUNT_JSON"

# Prompt for other secrets
echo -e "${YELLOW}🔑 Please enter your keystore details:${NC}"
read -s -p "Keystore password: " KEYSTORE_PASSWORD
echo
gh secret set KEYSTORE_PASSWORD --body "$KEYSTORE_PASSWORD"

read -p "Key alias: " KEY_ALIAS
gh secret set KEY_ALIAS --body "$KEY_ALIAS"

read -s -p "Key password: " KEY_PASSWORD
echo
gh secret set KEY_PASSWORD --body "$KEY_PASSWORD"

echo -e "${GREEN}✅ All secrets set successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Secrets configured:${NC}"
echo "- KEYSTORE_BASE64"
echo "- KEYSTORE_PASSWORD"
echo "- KEY_ALIAS"
echo "- KEY_PASSWORD"
echo "- GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"
echo ""
echo -e "${GREEN}🚀 Your repository is now ready for automated deployments!${NC}"
