import type React from "react"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
