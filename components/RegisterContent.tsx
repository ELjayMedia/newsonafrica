"use client"

import { RegisterForm } from "./RegisterForm"

export function RegisterContent() {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create an Account</h1>
        <p className="text-sm text-gray-600 mt-2">Join News On Africa to access exclusive content</p>
      </div>
      <RegisterForm />
    </div>
  )
}
