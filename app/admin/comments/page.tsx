import type { Metadata } from "next"
import CommentsMigration from "@/components/admin/CommentsMigration"

export const metadata: Metadata = {
  title: "Comments Management | Admin Dashboard",
  description: "Manage comments and comment system configuration",
}

export default function CommentsAdminPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Comments Management</h1>

      <div className="grid gap-8">
        <CommentsMigration />

        {/* Add more comment management components here */}
      </div>
    </div>
  )
}
