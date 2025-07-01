import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.newsonafrica.app',
  appName: 'NewsOnAfrica',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    LocalNotifications: {
      sound: 'beep.wav',
    },
  },
}

export default config
