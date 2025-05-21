import type { Metadata } from "next"
import NotFoundClient from "@/components/not-found-client"

export const metadata: Metadata = {
  title: "Page Not Found | News On Africa",
  description: "The page you are looking for does not exist.",
}

export default function NotFound() {
  return <NotFoundClient />
}
