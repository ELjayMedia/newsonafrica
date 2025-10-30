# Deployment Guide

This project deploys the Next.js web application using GitHub Actions and Vercel.

## Required Secrets

Add these secrets to your repository settings:

- `VERCEL_TOKEN` – Vercel deployment token
- `VERCEL_ORG_ID` – Vercel organization ID
- `VERCEL_PROJECT_ID` – Vercel project ID

## Environment Variables

Ensure the following environment variables are configured in GitHub and Vercel:

- WordPress GraphQL endpoints: `NEXT_PUBLIC_WP_SZ_GRAPHQL`, `NEXT_PUBLIC_WP_ZA_GRAPHQL` (optional overrides)
- WordPress GraphQL authentication: `WORDPRESS_GRAPHQL_AUTH_HEADER` (optional JSON/object for server-side headers)
- `NEXT_PUBLIC_DEFAULT_SITE` (defaults to `sz` if omitted)
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_FACEBOOK_APP_ID` (optional, enables Facebook app metadata)

## Workflow Overview

1. **Web Deploy** – builds and deploys the application to Vercel

## Manual Deployment

\`\`\`bash
pnpm install
pnpm build
pnpm dlx vercel --prod
\`\`\`

## Troubleshooting

1. **Build Failures** – check the GitHub Actions logs for details
2. **Missing Secrets** – ensure all required secrets and environment variables are set

## Monitoring

- Web deployments are monitored via the Vercel dashboard
- GitHub Actions provide build status and logs
