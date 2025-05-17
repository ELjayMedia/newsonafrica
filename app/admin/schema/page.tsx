import type { Metadata } from "next"
import SchemaVersions from "@/components/admin/SchemaVersions"

export const metadata: Metadata = {
  title: "Database Schema Management",
  description: "Manage database schema versions and migrations",
}

export default function SchemaPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Database Schema Management</h1>
      <SchemaVersions />
    </div>
  )
}
