"use client"

import { LostPasswordForm } from "./LostPasswordForm"

export default function LostPasswordContent() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reset Password</h1>
      <p className="mb-4 text-gray-600">
        Enter your email address below and we'll send you a link to reset your password.
      </p>
      <LostPasswordForm />
    </div>
  )
}

// For backwards compatibility
export { LostPasswordContent }
