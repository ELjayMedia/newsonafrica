# Deployment Guide

## GitHub Actions Deployment

This project uses GitHub Actions for automated deployment of both web and mobile applications.

### Required Secrets

Add these secrets to your GitHub repository settings:

#### Web Deployment (Vercel)
- `VERCEL_TOKEN` - Your Vercel deployment token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

#### Expo/Mobile Deployment
- `EXPO_TOKEN` - Your Expo access token
- `APPLE_ID` - Apple ID for iOS submissions
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password for Apple ID
- `APPLE_TEAM_ID` - Apple Developer Team ID
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Google Play Console service account key

- `GOOGLE_SERVICES_JSON` - Firebase config for Android (base64 or raw JSON)
#### Environment Variables
- `NEXT_PUBLIC_WORDPRESS_API_URL`
- `NEXT_PUBLIC_WORDPRESS_REST_API_URL`
- `WORDPRESS_REST_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH0_DOMAIN`
- `NEXT_PUBLIC_AUTH0_CLIENT_ID`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`

The project generates `robots.txt` using the route
`app/robots.txt/route.ts`. Set `NEXT_PUBLIC_SITE_URL` so sitemap links in this
file use your production domain.

### Workflow Overview

1. **Web Deploy**: Builds and deploys the Next.js application to Vercel
2. **Expo Build**: Creates iOS and Android builds using EAS Build
3. **Expo Preview**: Creates preview builds for pull requests
4. **Expo Submit**: Submits builds to App Store and Google Play (production only)
5. **Expo Update**: Publishes OTA updates for existing app installations

### Manual Deployment

#### Web
\`\`\`bash
npm run build
vercel --prod
\`\`\`

#### Mobile
\`\`\`bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android

# Publish OTA update
eas update --branch production
\`\`\`

### Build Profiles

- **Development**: For local development with Expo Dev Client
- **Preview**: Internal distribution for testing
- **Production**: App store releases

### Troubleshooting

1. **Build Failures**: Check the GitHub Actions logs for detailed error messages
2. **Missing Secrets**: Ensure all required secrets are configured in repository settings
3. **Expo Token**: Generate a new token from https://expo.dev/accounts/[account]/settings/access-tokens
4. **Apple Certificates**: Ensure your Apple Developer account has valid certificates
5. **Google Play**: Verify your Google Play Console service account has proper permissions

### Monitoring

- Web deployments are monitored via Vercel dashboard
- Mobile builds are tracked in Expo dashboard
- GitHub Actions provide build status and logs
