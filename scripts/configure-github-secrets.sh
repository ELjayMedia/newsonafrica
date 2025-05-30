#!/bin/bash

# GitHub Secrets Configuration Script
echo "🔐 Configuring GitHub Secrets for News On Africa..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}GitHub Repository Secrets Setup${NC}"
echo "============================================"
echo ""
echo "Add these secrets to your GitHub repository:"
echo "Go to: Settings > Secrets and variables > Actions"
echo ""

echo -e "${YELLOW}🌐 Vercel Secrets:${NC}"
echo "VERCEL_TOKEN=your_vercel_token"
echo "VERCEL_ORG_ID=your_org_id"
echo "VERCEL_PROJECT_ID=your_project_id"
echo ""

echo -e "${YELLOW}📱 Expo Secrets:${NC}"
echo "EXPO_TOKEN=your_expo_access_token"
echo ""

echo -e "${YELLOW}🍎 Apple Secrets:${NC}"
echo "APPLE_ID=your-apple-id@example.com"
echo "APPLE_APP_SPECIFIC_PASSWORD=your_app_specific_password"
echo "APPLE_TEAM_ID=your_team_id"
echo ""

echo -e "${YELLOW}🤖 Google Secrets:${NC}"
echo "GOOGLE_SERVICE_ACCOUNT_KEY=<paste entire JSON content>"
echo ""

echo -e "${YELLOW}🔑 App Environment Variables:${NC}"
echo "NEXT_PUBLIC_WORDPRESS_API_URL=$NEXT_PUBLIC_WORDPRESS_API_URL"
echo "NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL"
echo "NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID"
echo "NEXT_PUBLIC_ADSENSE_CLIENT_ID=$NEXT_PUBLIC_ADSENSE_CLIENT_ID"
echo "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "NEXT_PUBLIC_AUTH0_DOMAIN=$NEXT_PUBLIC_AUTH0_DOMAIN"
echo "NEXT_PUBLIC_AUTH0_CLIENT_ID=$NEXT_PUBLIC_AUTH0_CLIENT_ID"
echo "NEXT_PUBLIC_PAYPAL_CLIENT_ID=$NEXT_PUBLIC_PAYPAL_CLIENT_ID"
echo "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"
echo ""

echo -e "${GREEN}📋 How to get each credential:${NC}"
echo ""
echo "1. VERCEL_TOKEN: https://vercel.com/account/tokens"
echo "2. EXPO_TOKEN: https://expo.dev/accounts/[account]/settings/access-tokens"
echo "3. APPLE_APP_SPECIFIC_PASSWORD: https://appleid.apple.com/account/manage > App-Specific Passwords"
echo "4. GOOGLE_SERVICE_ACCOUNT_KEY: Google Cloud Console > IAM & Admin > Service Accounts"
echo ""

# Create a template file for easy copying
cat > github-secrets-template.txt << EOF
# GitHub Secrets Template for News On Africa

# Vercel
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=

# Expo
EXPO_TOKEN=

# Apple
APPLE_ID=
APPLE_APP_SPECIFIC_PASSWORD=
APPLE_TEAM_ID=

# Google
GOOGLE_SERVICE_ACCOUNT_KEY=

# Environment Variables
NEXT_PUBLIC_WORDPRESS_API_URL=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_AUTH0_DOMAIN=
NEXT_PUBLIC_AUTH0_CLIENT_ID=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
EOF

echo -e "${GREEN}✅ Template created: github-secrets-template.txt${NC}"
