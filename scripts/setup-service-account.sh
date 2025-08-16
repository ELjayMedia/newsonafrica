#!/bin/bash

echo "🚀 Google Play Service Account Setup"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="news-on-africa"
SERVICE_ACCOUNT_NAME="play-store-deployment"
SERVICE_ACCOUNT_DISPLAY_NAME="Play Store Deployment"
SERVICE_ACCOUNT_DESCRIPTION="Service account for automated Play Store deployments"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "Project Name: $PROJECT_NAME"
echo "Service Account: $SERVICE_ACCOUNT_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI not found${NC}"
    echo -e "${YELLOW}💡 Install from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Login to gcloud
echo -e "${YELLOW}🔐 Please login to Google Cloud...${NC}"
gcloud auth login

# Create project
echo -e "${YELLOW}🏗️  Creating Google Cloud project...${NC}"
gcloud projects create $PROJECT_NAME --name="News On Africa"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Project created successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Project might already exist, continuing...${NC}"
fi

# Set project
gcloud config set project $PROJECT_NAME

# Enable billing (required for API access)
echo -e "${YELLOW}💳 Please enable billing for this project in the Cloud Console${NC}"
echo -e "${BLUE}🔗 https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_NAME${NC}"
read -p "Press Enter after enabling billing..."

# Enable required APIs
echo -e "${YELLOW}🔌 Enabling Google Play Developer API...${NC}"
gcloud services enable androidpublisher.googleapis.com

# Create service account
echo -e "${YELLOW}👤 Creating service account...${NC}"
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="$SERVICE_ACCOUNT_DISPLAY_NAME" \
    --description="$SERVICE_ACCOUNT_DESCRIPTION"

# Get service account email
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_NAME.iam.gserviceaccount.com"

# Create and download key
echo -e "${YELLOW}🔑 Creating service account key...${NC}"
gcloud iam service-accounts keys create google-play-service-account.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Service account key created: google-play-service-account.json${NC}"
else
    echo -e "${RED}❌ Failed to create service account key${NC}"
    exit 1
fi

# Display next steps
echo ""
echo -e "${GREEN}🎉 Service Account Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Go to Google Play Console: https://play.google.com/console"
echo "2. Navigate to Setup → API access"
echo "3. Link this Google Cloud project: $PROJECT_NAME"
echo "4. Grant permissions to: $SERVICE_ACCOUNT_EMAIL"
echo "   - Release manager"
echo "   - View app information and download bulk reports"
echo ""
echo -e "${BLUE}📁 Files created:${NC}"
echo "- google-play-service-account.json (keep this secure!)"
echo ""
echo -e "${RED}⚠️  Security Note:${NC}"
echo "- Never commit the JSON file to version control"
echo "- Store it securely and use environment variables"
