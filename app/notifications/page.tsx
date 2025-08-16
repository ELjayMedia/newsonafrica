import type { Metadata } from "next"
import { NotificationsContent } from "@/components/NotificationsContent"

export const metadata: Metadata = {
  title: "Notifications | News on Africa",
  description: "View and manage your notifications",
}

export default function NotificationsPage() {
  return <NotificationsContent />
}
