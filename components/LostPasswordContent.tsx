"use client"

import { LostPasswordForm } from "./LostPasswordForm"

export default function LostPasswordContent() {
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <LostPasswordForm />
    </div>
  )
}

// For backwards compatibility
export { LostPasswordContent }
