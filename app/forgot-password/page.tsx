import type { Metadata } from "next"
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm"

export const metadata: Metadata = {
  title: "Forgot Password - News On Africa",
  description: "Reset your News On Africa password",
}

export default function ForgotPasswordPage() {
  return (
    <div className="container max-w-md mx-auto py-10 px-4">
      <ForgotPasswordForm />
    </div>
  )
}
