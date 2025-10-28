# Supabase OAuth Configuration Guide

## Required Redirect URLs

Add these URLs to your Supabase project settings:

**Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

### Production URLs
- `https://app.newsonafrica.com/auth/callback`
- `https://app.newsonafrica.com/`
- `https://app.newsonafrica.com/auth`

### Development URLs (shared staging environment)
- `http://app.newsonafrica.com/auth/callback`
- `http://app.newsonafrica.com/`
- `http://app.newsonafrica.com/auth`

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`
6. Copy Client ID and Client Secret to Supabase

## Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create or select your app
3. Add Facebook Login product
4. Configure Valid OAuth Redirect URIs:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`
5. Copy App ID and App Secret to Supabase

## Supabase Configuration

In your Supabase project:

1. **Authentication → Providers → Google**
   - Enable Google provider
   - Add Client ID and Client Secret
   - Enable "Confirm email" if desired

2. **Authentication → Providers → Facebook**
   - Enable Facebook provider
   - Add Client ID and Client Secret
   - Enable "Confirm email" if desired

3. **Authentication → Settings**
   - Site URL: `https://app.newsonafrica.com`
   - Redirect URLs: (as listed above)

## Testing

1. Test OAuth flow in development
2. Verify redirect URLs work correctly
3. Check that user profiles are created automatically
4. Ensure session persistence works

## Troubleshooting

- **Redirected to Google/Facebook homepage**: Check redirect URLs are whitelisted
- **"Invalid redirect URI" error**: Verify OAuth app settings match Supabase callback URL
- **Session not persisting**: Check that callback handler is working correctly
- **Profile not created**: Verify database permissions and RLS policies

## Client-side Auth State Management

To keep the signed-in user available across your application, add a client-side store that reacts to Supabase session changes.

1. Create a context or store (for example, `contexts/AuthContext.tsx`) that exposes the current `session` and `user`.
2. Subscribe to Supabase auth events with `supabase.auth.onAuthStateChange` and update the store whenever a session starts, refreshes, or ends.
3. Wrap your app in the provider so components can call a `useAuth` hook to access user data and loading state.
4. In pages that require authentication, check the user from the auth context before rendering protected content.

With these steps in place, the OAuth setup will surface session changes instantly in the UI and prevent stale auth states.
