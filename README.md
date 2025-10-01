# News On Africa PWA

A Progressive Web App for delivering news content across Africa with a focus on performance, offline capabilities, and user engagement.

## ⚠️ Quick Fix: GraphQL/REST API Issues

**If you're seeing 404 errors or "GraphQL endpoint appears to be REST API" warnings:**

The environment variables `NEXT_PUBLIC_WORDPRESS_API_URL` and `WORDPRESS_REST_API_URL` may be set incorrectly. 

**Quick Solution:** Delete these variables from your Vercel Environment Variables and redeploy. The app will use correct defaults automatically.

See [Troubleshooting Guide](./docs/troubleshooting.md) for detailed solutions.

## 🌟 Features

- **Mobile-first, responsive design**: Optimized for all devices with a focus on mobile experience
- **Offline reading capabilities**: Service worker implementation for offline content access
- **Push notifications**: Real-time alerts for breaking news
- **Fast loading times**: Optimized assets and code splitting for performance
- **Authentication**: Multi-provider auth with email, Google, and Facebook
- **Personalization**: User profiles, bookmarks, and preferences
- **Ad integration**: Flexible ad placement system for monetization
- **Search functionality**: Fast, relevant content discovery
- **Multi-site architecture**: Support for country-specific editions
- **Planned Web2Native conversion**: Future native wrappers will package the PWA for app stores

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

- Node.js 18+ and npm/yarn
- Supabase account
- WordPress instance with REST API

### Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`
# --- App Configuration ---
NEXT_PUBLIC_DEFAULT_SITE=sz
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# --- WordPress Endpoints ---
# IMPORTANT: These are OPTIONAL. The app has smart defaults.
# Only set these if you need to override the defaults.
# Correct format:
#   GraphQL: https://newsonafrica.com/{country}/graphql
#   REST:    https://newsonafrica.com/{country}/wp-json/wp/v2

# Option 1: Let the app use defaults (recommended)
# Just set NEXT_PUBLIC_DEFAULT_SITE above and skip these

# Option 2: Country-specific endpoints (for multi-site)
NEXT_PUBLIC_WORDPRESS_API_URL_SZ=https://newsonafrica.com/sz/graphql
NEXT_PUBLIC_WORDPRESS_API_URL_ZA=https://newsonafrica.com/za/graphql
WORDPRESS_REST_API_URL_SZ=https://newsonafrica.com/sz/wp-json/wp/v2
WORDPRESS_REST_API_URL_ZA=https://newsonafrica.com/za/wp-json/wp/v2

# Option 3: Single endpoint override (not recommended for multisite)
# NEXT_PUBLIC_WORDPRESS_API_URL=https://newsonafrica.com/sz/graphql
# WORDPRESS_REST_API_URL=https://newsonafrica.com/sz/wp-json/wp/v2

# --- WordPress Authentication ---
WP_APP_USERNAME=your_wordpress_username
WP_APP_PASSWORD=your_wordpress_app_password

# --- Supabase Configuration ---
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# --- Paystack Configuration ---
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# --- Security & Webhooks ---
CSRF_SECRET=your_random_csrf_secret_min_32_chars
REVALIDATION_SECRET=your_random_revalidation_secret
WORDPRESS_WEBHOOK_SECRET=your_wordpress_webhook_secret

# --- Social Integration (Optional) ---
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id

# --- Feature Flags (Optional) ---
FEATURE_COMMENTS=true
FEATURE_BOOKMARKS=true
FEATURE_SUBSCRIPTIONS=true
FEATURE_ADVANCED_SEARCH=true
\`\`\`

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/your-org/news-on-africa.git
cd news-on-africa

# Install dependencies
npm install

# Run the development server
npm run dev
\`\`\`

## 📦 Deployment

The application is deployed on Vercel with the following configuration:

1. **Build Command**: `npm run build`
2. **Output Directory**: `.next`
3. **Environment Variables**: Set all required variables in Vercel dashboard

**Important:** For WordPress endpoints, either:
- Leave `NEXT_PUBLIC_WORDPRESS_API_URL` and `WORDPRESS_REST_API_URL` unset (recommended)
- Or ensure they follow the correct format with country slugs

See [Troubleshooting Guide](./docs/troubleshooting.md#graphql-404-errors--rest-fallback-issues) for details.

## 📱 Future Web2Native Conversion

Web2Native tooling will later be used to convert this PWA into installable native applications. Planned steps include:

1. Configure the Web2Native project with app details.
2. Generate platform-specific builds.
3. Submit the builds to the respective app stores.

Documentation for this workflow will be added once available.

## 🧪 Testing

\`\`\`bash
# Run unit tests
npm test

# Run end-to-end tests
npm run test:e2e

# Run linting
npm run lint
\`\`\`

## 📚 Documentation

Additional documentation:

- [Troubleshooting Guide](./docs/troubleshooting.md) ⭐ **Start here for common issues**
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
