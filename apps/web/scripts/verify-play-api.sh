#!/bin/bash

echo "🔍 Google Play API Setup Verification"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if service account JSON exists
if [ -f "google-play-service-account.json" ]; then
    echo -e "${GREEN}✅ Service account JSON file found${NC}"
    
    # Extract project ID and service account email
    PROJECT_ID=$(cat google-play-service-account.json | grep -o '"project_id": "[^"]*' | cut -d'"' -f4)
    SERVICE_ACCOUNT_EMAIL=$(cat google-play-service-account.json | grep -o '"client_email": "[^"]*' | cut -d'"' -f4)
    
    echo -e "${GREEN}📋 Project ID: ${PROJECT_ID}${NC}"
    echo -e "${GREEN}📧 Service Account: ${SERVICE_ACCOUNT_EMAIL}${NC}"
else
    echo -e "${RED}❌ Service account JSON file not found${NC}"
    echo -e "${YELLOW}💡 Please download it from Google Cloud Console and save as 'google-play-service-account.json'${NC}"
    exit 1
fi

# Check if gcloud CLI is installed
if command -v gcloud &> /dev/null; then
    echo -e "${GREEN}✅ Google Cloud CLI installed${NC}"
    
    # Try to authenticate with service account
    echo -e "${YELLOW}🔐 Testing service account authentication...${NC}"
    gcloud auth activate-service-account --key-file=google-play-service-account.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Service account authentication successful${NC}"
        
        # Check if Play Developer API is enabled
        echo -e "${YELLOW}🔍 Checking if Play Developer API is enabled...${NC}"
        gcloud services list --enabled --filter="name:androidpublisher.googleapis.com" --format="value(name)" | grep -q androidpublisher
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Google Play Developer API is enabled${NC}"
        else
            echo -e "${RED}❌ Google Play Developer API is not enabled${NC}"
            echo -e "${YELLOW}💡 Enable it at: https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com${NC}"
        fi
    else
        echo -e "${RED}❌ Service account authentication failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Google Cloud CLI not installed${NC}"
    echo -e "${YELLOW}💡 Install from: https://cloud.google.com/sdk/docs/install${NC}"
fi

echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Ensure your app is created in Play Console"
echo "2. Link your Google Cloud project in Play Console"
echo "3. Grant permissions to the service account"
echo "4. Test with: fastlane android internal"
