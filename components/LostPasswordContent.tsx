"use client"

import { LostPasswordForm } from "./LostPasswordForm"

export default function LostPasswordContent() {
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>
      <LostPasswordForm />
    </div>
  )
}

// Also export as named export for backward compatibility
export { LostPasswordContent }
