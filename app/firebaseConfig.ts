import { initializeApp } from "@react-native-firebase/app"
import analytics from "@react-native-firebase/analytics"

const firebaseConfig = {
  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  apiKey: "AIzaSyAUxYLeoLY9f64Ztjf72ctUvDwAAVGypwI",
  projectId: "news-on-africa---ga4",
  storageBucket: "news-on-africa---ga4.firebasestorage.app",
  appId: "1:983051753775:android:22fc9cdc5dd08cafdf69da",
  measurementId: "G-DQVSXQ97WQ",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analyticsInstance = analytics()

export { app, analyticsInstance as analytics }
