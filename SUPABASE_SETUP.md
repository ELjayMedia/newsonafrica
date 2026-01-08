# Supabase Setup Guide

This document explains how to connect your News On Africa app to Supabase using environment variables.

## Environment Variables Required

The app needs the following Supabase environment variables in your `.env.local` file:

```env
# Client-side (public) variables - used in browser
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side variables - used in API routes and server components
# The service role key is mandatory for any admin scripts, migrations, or background jobs
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

## How to Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
5. For JWT Secret, go to **Settings** → **API** → **JWT Settings**
   - Copy **JWT Secret** → `SUPABASE_JWT_SECRET`

## Current Supabase Integration

The app uses Supabase for:

### Authentication
- Email/password sign up and sign in
- OAuth providers (Google, Facebook)
- Session management with refresh tokens
- Password reset functionality

### Database
- User profiles storage
- Bookmarks storage
- Comments storage
- Subscriptions management

### Storage
- User avatar uploads
- Profile images

## Supabase Client Files

The app has three Supabase client implementations:

### 1. Browser Client (`lib/supabase/browser-client.ts`)
Used in client components for authentication and data fetching:
```typescript
import { createClient } from '@/lib/supabase/browser-helpers'
const supabase = createClient()
```

### 2. Server Client (`lib/supabase/server.ts`)
Used in Server Components and API routes:
```typescript
import { createServerClient } from '@/lib/supabase/server'
const supabase = createServerClient()
```

### 3. Admin Client (`lib/supabase/admin.ts`)
Used for admin operations with elevated privileges:
```typescript
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()
```

> The admin client **always** requires `SUPABASE_SERVICE_ROLE_KEY`. The anon key is not sufficient for migrations or privileged tasks.

## Testing Your Connection

After adding the environment variables to `.env.local`:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000` - if Supabase is configured, you'll see authentication features

3. Check the browser console - you should NOT see any Supabase configuration errors

4. Try signing up or signing in - this will test the connection

## Troubleshooting

### Error: "Supabase configuration is missing"
- Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local`
- Restart your dev server after adding variables

### Error: "Invalid JWT"
- Check that your `SUPABASE_JWT_SECRET` matches your Supabase project
- Verify the JWT secret in Supabase Dashboard → Settings → API

### Connection timeout
- Verify your Supabase project URL is correct
- Check if your Supabase project is paused (free tier projects pause after inactivity)

### Auth not working
- Verify email templates are configured in Supabase Dashboard → Authentication → Email Templates
- Check that your site URL is added to allowed redirect URLs in Supabase Dashboard → Authentication → URL Configuration

## Database Schema

The app expects the following tables in Supabase:

- `profiles` - User profile information
- `bookmarks` - User bookmarks for articles
- `comments` - Article comments
- `subscriptions` - User subscription data

Make sure these tables exist in your Supabase database before running the app.

## Security Notes

- Never commit `.env.local` to version control
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security - use with caution
- Always use RLS policies to secure your database tables
- Use the anon key in client-side code, service role only on the server

## Additional Resources

- [Supabase Next.js Documentation](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
