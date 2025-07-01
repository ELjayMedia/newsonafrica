# Capacitor Setup

This project can run as a native application using [Capacitor](https://capacitorjs.com/).

## Installation

1. Install Capacitor packages:

\`\`\`bash
npm install @capacitor/core @capacitor/cli
\`\`\`

2. Initialize Capacitor with the provided configuration:

\`\`\`bash
npx cap init com.newsonafrica.app "NewsOnAfrica" --web-dir=dist
\`\`\`

3. Add desired platforms:

\`\`\`bash
npx cap add ios
npx cap add android
\`\`\`

## Exporting Web Assets

Run the helper script to export the Next.js build and sync platforms:

\`\`\`bash
./export-capacitor.sh
\`\`\`

The script builds the project, exports static files to the `dist` directory, runs `npx cap sync`, and copies the assets to each native platform.
