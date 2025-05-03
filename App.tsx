"use client"

import { app } from "./firebaseConfig"
import { useEffect } from "react"

function App() {
  useEffect(() => {
    if (app) {
      console.log("Firebase has been initialized successfully")
    }
  }, [])

  return (
    <div>
      <h1>Hello, Firebase!</h1>
    </div>
  )
}

export default App
