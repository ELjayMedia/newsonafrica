#!/bin/bash

set -e

echo "🚀 News On Africa TWA Deployment Script"
echo "======================================="

# Configuration
APP_VERSION=$(grep '"appVersionName"' twa-manifest.json | sed 's/.*: *"$$[^"]*$$".*/\1/')
BUILD_TYPE="release"

echo "📱 App Version: $APP_VERSION"
echo "🔨 Build Type: $BUILD_TYPE"
echo ""

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
if [ -d "app" ]; then
    cd app
    ./gradlew clean
    cd ..
fi

# Step 2: Build the TWA
echo "🔨 Building TWA..."
bubblewrap build

# Step 3: Build release AAB
echo "📦 Building release AAB..."
cd app
./gradlew bundleRelease

# Step 4: Build release APK (for testing)
echo "📱 Building release APK..."
./gradlew assembleRelease

cd ..

# Step 5: Verify builds
echo "✅ Verifying builds..."
APK_PATH="app/build/outputs/apk/release/app-release.apk"
AAB_PATH="app/build/outputs/bundle/release/app-release.aab"

if [ -f "$APK_PATH" ]; then
    echo "✅ APK built successfully: $APK_PATH"
    echo "   Size: $(du -h "$APK_PATH" | cut -f1)"
else
    echo "❌ APK build failed"
    exit 1
fi

if [ -f "$AAB_PATH" ]; then
    echo "✅ AAB built successfully: $AAB_PATH"
    echo "   Size: $(du -h "$AAB_PATH" | cut -f1)"
else
    echo "❌ AAB build failed"
    exit 1
fi

# Step 6: Create release directory
RELEASE_DIR="releases/v$APP_VERSION"
mkdir -p "$RELEASE_DIR"

# Copy files to release directory
cp "$APK_PATH" "$RELEASE_DIR/"
cp "$AAB_PATH" "$RELEASE_DIR/"

echo ""
echo "🎉 Build completed successfully!"
echo "📂 Files available in: $RELEASE_DIR"
echo ""
echo "📱 For testing: Install $RELEASE_DIR/app-release.apk"
echo "🏪 For Play Store: Upload $RELEASE_DIR/app-release.aab"
echo ""

# Step 7: Optional - Upload to Play Store
read -p "🚀 Open release folder now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    xdg-open "$RELEASE_DIR" 2>/dev/null || open "$RELEASE_DIR"
    echo "💡 Upload $AAB_PATH to the Play Console manually"
fi

echo ""
echo "📋 Next steps:"
echo "1. Test the APK on a device: adb install $RELEASE_DIR/app-release.apk"
echo "2. Upload AAB to Play Console: https://play.google.com/console"
echo "3. Set up automated deployment with GitHub Actions"
