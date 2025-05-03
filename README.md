# News on Africa PWA

A Progressive Web App for delivering news content across Africa.

## Features

- Mobile-first, responsive design
- Offline reading capabilities
- Push notifications for breaking news
- Fast loading times with optimized assets
- Authentication and personalized content
- Ad integration for monetization
- Powerful search functionality

## Environment Variables

This project requires the following environment variables to be set:

- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`: Your Google AdSense client ID
- `WORDPRESS_API_URL`: Your WordPress API URL
- `NEXT_PUBLIC_WORDPRESS_API_URL`: Your WordPress API URL (for client-side)
- `WP_APP_USERNAME`: WordPress application username
- `WP_APP_PASSWORD`: WordPress application password
- `JWT_SECRET`: Secret for JWT token generation
- `CSRF_SECRET`: Secret for CSRF protection
- `NEXT_PUBLIC_SITE_URL`: Public URL of your site
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: Google Analytics measurement ID
- `NEXT_PUBLIC_FACEBOOK_APP_ID`: Facebook App ID
- `FACEBOOK_APP_SECRET`: Facebook App Secret
- `NEXT_PUBLIC_ALGOLIA_APP_ID`: Algolia App ID
- `NEXT_PUBLIC_ALGOLIA_INDEX_NAME`: Algolia Index Name
- `NEXT_PUBLIC_DISQUS_SHORTNAME`: Disqus Shortname
- `DISQUS_PUBLIC_KEY`: Disqus Public Key
- `DISQUS_SECRET_KEY`: Disqus Secret Key

Additional API keys for search and social sharing are configured through server-side components and are not exposed to the client.

Make sure to set these variables in your Vercel project settings or in a `.env.local` file for local development.

To set up these variables:

1. Create the necessary accounts for each service
2. Copy the required keys and IDs from each service
3. Set the environment variables in your Vercel project settings or `.env.local` file

Note: Never commit your `.env.local` file or expose your secrets publicly.
