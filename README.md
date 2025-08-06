# News On Africa PWA

A Progressive Web App for delivering news content across Africa with a focus on performance, offline capabilities, and user engagement.

## 🌟 Features

- **Mobile-first, responsive design**: Optimized for all devices with a focus on mobile experience
- **Offline reading capabilities**: Service worker implementation for offline content access
- **Push notifications**: Real-time alerts for breaking news
- **Fast loading times**: Optimized assets and code splitting for performance
- **Authentication**: Multi-provider auth with email, Google, and Facebook
- **Personalization**: User profiles, bookmarks, and preferences
- **Server-side bookmark stats**: Bookmark statistics are computed via a Supabase RPC
- **Ad integration**: Flexible ad placement system for monetization
- **Search functionality**: Fast, relevant content discovery
- **Multi-site architecture**: Support for country-specific editions

## 🏗️ Architecture

### Frontend Architecture

The application follows a feature-based architecture with the following structure:

\`\`\`
news-on-africa/
├── app/                  # Next.js App Router pages and layouts
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── category/         # Category pages
│   ├── post/             # Post pages
│   └── ...               # Other page routes
├── components/           # Shared React components
│   ├── ui/               # UI components (buttons, inputs, etc.)
│   ├── layout/           # Layout components
│   └── features/         # Feature-specific components
├── contexts/             # React context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── services/             # API service modules
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
\`\`\`

### Data Flow

1. **Content Source**: WordPress CMS with REST API
2. **Authentication**: Supabase Auth with JWT tokens
3. **Data Storage**: Supabase PostgreSQL for user data
4. **Caching**: Next.js ISR (Incremental Static Regeneration)
5. **CDN**: Vercel Edge Network

## 🚀 Getting Started

### Prerequisites

 - Node.js 18+ and pnpm
- Supabase account
- WordPress instance with REST API

### Environment Variables

Create a `.env.local` file with the following variables. WordPress endpoints are
derived from `NEXT_PUBLIC_WP_BASE_URL` and the active country code.

\`\`\`
# WordPress
NEXT_PUBLIC_WP_BASE_URL=https://your-wordpress-site.com
NEXT_PUBLIC_DEFAULT_COUNTRY=sz
WP_APP_USERNAME=your_app_username
WP_APP_PASSWORD=your_app_password
WORDPRESS_AUTH_TOKEN=your_wordpress_auth_token

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_API_BASE=https://api.paystack.co

# Authentication
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
JWT_SECRET=your_jwt_secret

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-S55PVESFS2

# Site
NEXT_PUBLIC_SITE_URL=https://your-site-url.com
GOOGLE_SERVICES_JSON=your_firebase_config_json
\`\`\`
The application serves `robots.txt` from a Next.js route at
`app/robots.txt/route.ts`. Ensure `NEXT_PUBLIC_SITE_URL` is configured so the
generated sitemap URLs use the correct domain.
Copy `google-services.json.example` to `google-services.json` and fill in your Firebase credentials. Keep this file out of version control. During automated deployments, decode the `GOOGLE_SERVICES_JSON` secret and write it to `google-services.json`.
`WORDPRESS_AUTH_TOKEN` is used for authenticated WordPress requests.
`JWT_SECRET` is the key for signing JSON Web Tokens.

### Subscription Setup

Run the subscription database migration to create plans, subscriptions, and payments tables:

```bash
supabase db push --file lib/migrations/1.7.0-subscriptions.sql
```

Configure your Paystack dashboard webhook to point to `/api/webhooks/paystack`.

To test the flow locally, start the development server and use a Paystack test card on the `/subscribe` page. You can trigger webhook events from the Paystack dashboard to simulate billing events.

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/your-org/news-on-africa.git
cd news-on-africa

# Install dependencies
pnpm install

# Run the development server
pnpm run dev
\`\`\`

## 📦 Deployment

The application is deployed on Vercel with the following configuration:

1. **Build Command**: `pnpm run build`
2. **Output Directory**: `.next`
3. **Environment Variables**: Set all required variables in Vercel dashboard

### Android Build

1. Install dependencies with `npm install`.
2. Run `bash export-capacitor.sh` to generate the `out/` directory.
3. Run `npx cap sync android` (or `npx cap copy android`) to copy web assets and plugins.
4. Build artifacts (`.apk`, `.aab`) are ignored via `android/.gitignore`.

## ⚡ Performance

The homepage now prefetches posts and categories on the server and passes them to the client via `initialData`. This avoids an extra fetch on page load and speeds up the first render.

## PWA & Routing Enhancements

Environment variables now control endpoint selection. Set `NEXT_PUBLIC_WP_BASE_URL` and `NEXT_PUBLIC_DEFAULT_COUNTRY` to configure the WordPress host and default edition. Example:

```ts
import { getCountryEndpoints } from "./lib/getCountryEndpoints"
const { graphql, rest } = getCountryEndpoints("ng")
// graphql -> https://your-wordpress-site.com/ng/graphql
// rest     -> https://your-wordpress-site.com/ng
```

Run navigation routing tests with:

```bash
pnpm test
```

## 🧪 Testing

\`\`\`bash
# Run unit tests
pnpm test

# Run linting
pnpm run lint
\`\`\`

## 📚 Documentation

Additional documentation:

- [Component Documentation](./docs/components.md)
- [API Documentation](./docs/api.md)
- [Authentication Flow](./docs/auth.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
