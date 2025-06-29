#!/bin/bash

echo "🔍 Locating generated APK and AAB files..."
echo "================================================"

# Find APK files
echo "📱 APK Files (for testing):"
find . -name "*.apk" -type f 2>/dev/null | while read file; do
    echo "  📄 $file"
    echo "     Size: $(du -h "$file" | cut -f1)"
    echo "     Modified: $(stat -c %y "$file" 2>/dev/null || stat -f %Sm "$file" 2>/dev/null)"
    echo ""
done

# Find AAB files
echo "📦 AAB Files (for Play Store):"
find . -name "*.aab" -type f 2>/dev/null | while read file; do
    echo "  📄 $file"
    echo "     Size: $(du -h "$file" | cut -f1)"
    echo "     Modified: $(stat -c %y "$file" 2>/dev/null || stat -f %Sm "$file" 2>/dev/null)"
    echo ""
done

# Common locations
echo "📂 Common build output locations:"
echo "  • app/build/outputs/apk/debug/app-debug.apk"
echo "  • app/build/outputs/apk/release/app-release.apk"
echo "  • app/build/outputs/bundle/release/app-release.aab"
echo ""

# Check if files exist in common locations
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo "✅ Debug APK found: app/build/outputs/apk/debug/app-debug.apk"
fi

if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ Release APK found: app/build/outputs/apk/release/app-release.apk"
fi

if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
    echo "✅ Release AAB found: app/build/outputs/bundle/release/app-release.aab"
    echo "   👆 This is the file you need for Play Store submission!"
fi

echo ""
echo "💡 Tips:"
echo "  • Use APK files for local testing"
echo "  • Use AAB files for Play Store submission"
echo "  • Install APK with: adb install path/to/app.apk"
