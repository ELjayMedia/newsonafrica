import type { CapacitorConfig } from "@capacitor/cli"

const webDir = process.env.CAPACITOR_WEB_DIR || "out"

const config: CapacitorConfig = {
  appId: "com.newsonafrica.app", // Replace with your actual app ID
  appName: "News On Africa",
  webDir,
  bundledWebRuntime: false,
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config", // Path to your small icon for Android notifications
      iconColor: "#488AFF", // Color for the small icon
      sound: "beep.wav", // Custom sound for notifications (optional)
    },
    Camera: {
      web: {
        // Optional: Configure web-specific camera behavior if needed
      },
    },
    Geolocation: {
      // Optional: Configure web-specific geolocation behavior if needed
    },
    App: {
      // No specific configuration needed for @capacitor/app for basic usage
    },
    Browser: {
      // No specific configuration needed for @capacitor/browser for basic usage
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"], // iOS notification presentation options
    },
  },
  server: {
    androidScheme: "https",
    url: "http://localhost:3000", // Your local development URL
    cleartext: true, // Required for local development on Android with HTTP
  },
}

export default config
