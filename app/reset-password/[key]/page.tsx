import type { Metadata } from "next"
import ResetPasswordClient from "./ResetPasswordClient"
import { redirect } from "next/navigation"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Reset Password - News On Africa",
  description: "Reset your News On Africa password",
}

export default function ResetPasswordPage({ params }: { params: { key: string } }) {
  // After successful password reset, redirect to the auth page
  const onSuccess = () => {
    redirect("/auth")
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordClient resetKey={params.key} onSuccess={onSuccess} />
    </Suspense>
  )
}
