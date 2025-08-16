#!/bin/bash

echo "🚀 Setting up Fastlane for automated Play Store deployment..."

# Install fastlane
echo "📦 Installing fastlane..."
if command -v gem &> /dev/null; then
    sudo gem install fastlane -NV
elif command -v brew &> /dev/null; then
    brew install fastlane
else
    echo "❌ Please install Ruby or Homebrew first"
    exit 1
fi

# Create fastlane directory
mkdir -p fastlane

# Initialize fastlane
echo "🔧 Initializing fastlane..."
cd fastlane
fastlane init

echo "✅ Fastlane setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Place your Google Play service account JSON in fastlane/"
echo "2. Update fastlane/Appfile with your package name"
echo "3. Run: fastlane android deploy"
