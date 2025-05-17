import type React from "react"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute fallbackUrl="/auth?error=AdminRequired">{children}</ProtectedRoute>
}
