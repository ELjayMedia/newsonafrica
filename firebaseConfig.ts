import { initializeApp } from "@react-native-firebase/app"
import analytics from "@react-native-firebase/analytics"

const firebaseConfig = {
  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAUxYLeoLY9f64Ztjf72ctUvDwAAVGypwI",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "news-on-africa---ga4",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "news-on-africa---ga4.firebasestorage.app",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:983051753775:android:22fc9cdc5dd08cafdf69da",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DQVSXQ97WQ",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analyticsInstance = analytics()

export { app, analyticsInstance as analytics }
