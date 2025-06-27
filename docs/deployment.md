# Deployment Guide

## GitHub Actions Deployment

This project uses GitHub Actions for automated deployment of both web and mobile applications.

### Required Secrets

Add these secrets to your GitHub repository settings:

#### Web Deployment (Vercel)
- `VERCEL_TOKEN` - Your Vercel deployment token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID


#### Environment Variables
- `NEXT_PUBLIC_WORDPRESS_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH0_DOMAIN`
- `NEXT_PUBLIC_AUTH0_CLIENT_ID`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`

### Workflow Overview

1. **Web Deploy**: Builds and deploys the Next.js application to Vercel

### Manual Deployment

#### Web
\`\`\`bash
npm run build
vercel --prod
\`\`\`


### Troubleshooting

1. **Build Failures**: Check the GitHub Actions logs for detailed error messages
2. **Missing Secrets**: Ensure all required secrets are configured in repository settings
3. **Apple Certificates**: Ensure your Apple Developer account has valid certificates
4. **Google Play**: Verify your Google Play Console service account has proper permissions

### Monitoring

- Web deployments are monitored via Vercel dashboard
- Mobile builds are generated using Capacitor or TWA scripts
- GitHub Actions provide build status and logs
