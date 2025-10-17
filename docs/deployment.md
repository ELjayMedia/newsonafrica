# Deployment Guide

This project deploys the Next.js web application using GitHub Actions and Vercel.

## Required Secrets

Add these secrets to your repository settings:

- `VERCEL_TOKEN` – Vercel deployment token
- `VERCEL_ORG_ID` – Vercel organization ID
- `VERCEL_PROJECT_ID` – Vercel project ID

## Environment Variables

Ensure the following environment variables are configured in GitHub and Vercel:

- WordPress endpoints: country specific
  pairs such as `NEXT_PUBLIC_WP_SZ_GRAPHQL` / `NEXT_PUBLIC_WP_SZ_REST_BASE`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH0_DOMAIN`
- `NEXT_PUBLIC_AUTH0_CLIENT_ID`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`

## Workflow Overview

1. **Web Deploy** – builds and deploys the application to Vercel

## Manual Deployment

\`\`\`bash
npm run build
vercel --prod
\`\`\`

## Troubleshooting

1. **Build Failures** – check the GitHub Actions logs for details
2. **Missing Secrets** – ensure all required secrets and environment variables are set

## Monitoring

- Web deployments are monitored via the Vercel dashboard
- GitHub Actions provide build status and logs
