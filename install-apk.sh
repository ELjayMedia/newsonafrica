#!/bin/bash

echo "📱 Installing News On Africa TWA..."

# Find the latest APK
APK_PATH=$(find . -name "app-release.apk" -type f | head -1)

if [ -z "$APK_PATH" ]; then
    APK_PATH=$(find . -name "app-debug.apk" -type f | head -1)
fi

if [ -z "$APK_PATH" ]; then
    echo "❌ No APK found. Build the app first with:"
    echo "   ./deploy-twa.sh"
    exit 1
fi

echo "📄 Found APK: $APK_PATH"

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device connected"
    echo "💡 Connect your device and enable USB debugging"
    exit 1
fi

# Install the APK
echo "🔧 Installing APK..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Installation successful!"
    echo "🚀 Launch the app from your device"
else
    echo "❌ Installation failed"
    echo "💡 Try: adb install -r -d '$APK_PATH'"
fi
