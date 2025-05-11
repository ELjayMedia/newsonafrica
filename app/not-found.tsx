import type { Metadata } from "next"
import { NotFoundContent } from "@/components/NotFoundContent"

export const metadata: Metadata = {
  title: "Page Not Found | News On Africa",
  description: "The page you are looking for does not exist.",
}

export default function NotFoundPage() {
  return <NotFoundContent />
}
