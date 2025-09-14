# News On Africa PWA

A Progressive Web App for delivering news content across Africa with a focus on performance, offline capabilities, and user engagement.

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

- Node.js 20 (see `.nvmrc`)
- pnpm 9 (defined in `package.json`)
- Supabase account
- WordPress instance with REST API

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

The `.env.example` file documents all required keys.

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/news-on-africa.git
cd news-on-africa

# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

## 📦 Deployment

The application is deployed on Vercel with the following configuration:

1. **Build Command**: `pnpm build`
2. **Output Directory**: `.next`
3. **Environment Variables**: Set all required variables in Vercel dashboard

### Vercel Troubleshooting

- Ensure the correct Node version is selected in the Vercel project settings.
- Clear the build cache if you encounter unexpected build errors.
- Verify all required environment variables are set in Vercel.

## 📱 Future Web2Native Conversion

Web2Native tooling will later be used to convert this PWA into installable native applications. Planned steps include:

1. Configure the Web2Native project with app details.
2. Generate platform-specific builds.
3. Submit the builds to the respective app stores.

Documentation for this workflow will be added once available.

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run end-to-end tests
pnpm test:e2e

# Run linting
pnpm lint
```

## 🤖 Continuous Integration

Pull requests trigger a preflight workflow that installs dependencies and runs type checking and the production build using Node 20 and pnpm 9.

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
