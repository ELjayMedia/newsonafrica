#!/bin/bash

echo "Setting up Android TWA for News On Africa..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Java is required but not installed. Please install Java JDK 8 or higher."
    exit 1
fi

# Install Bubblewrap CLI globally
echo "Installing Bubblewrap CLI..."
npm install -g @bubblewrap/cli

# Initialize Bubblewrap (this will download Android SDK if needed)
echo "Initializing Bubblewrap..."
bubblewrap init --manifest=./twa-manifest.json

# Generate the Android project
echo "Generating Android TWA project..."
bubblewrap build

echo "Setup complete! Your Android project is ready."
echo "Next steps:"
echo "1. Open the generated 'app' folder in Android Studio"
echo "2. Build the project to generate the .aab file"
echo "3. Upload the .aab to Google Play Console"
