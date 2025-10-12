#!/bin/bash

echo "🔍 Verifying OAuth Setup for News On Africa"
echo "=========================================="

# Check if required environment variables are set
echo "📋 Checking environment variables..."

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set"
    exit 1
else
    echo "✅ NEXT_PUBLIC_SUPABASE_URL is set"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
    exit 1
else
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
fi

echo ""
echo "🌐 Required Redirect URLs for Supabase:"
echo "Production:"
echo "  - https://app.newsonafrica.com/auth/callback"
echo "  - https://app.newsonafrica.com/"
echo "  - https://app.newsonafrica.com/auth"
echo ""
DEV_APP_URL="http://app.newsonafrica.com"

echo "Development:"
echo "  - ${DEV_APP_URL}/auth/callback"
echo "  - ${DEV_APP_URL}/"
echo "  - ${DEV_APP_URL}/auth"
echo ""

echo "📱 OAuth Provider Callback URLs:"
echo "Google & Facebook should redirect to:"
echo "  - https://$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||')/auth/v1/callback"
echo ""

echo "🔧 Next Steps:"
echo "1. Add redirect URLs to Supabase Dashboard"
echo "2. Configure Google OAuth in Google Cloud Console"
echo "3. Configure Facebook OAuth in Facebook Developers"
echo "4. Test OAuth flow in development"
echo "5. Deploy and test in production"
echo ""

echo "📖 For detailed setup instructions, see:"
echo "   docs/supabase-oauth-setup.md"
