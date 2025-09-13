import { COMMENT_SYSTEM_MIGRATION } from "@/lib/supabase-migrations"

// Define the migration interface
export interface Migration {
  id: string
  name: string
  description: string
  sql: string
  version: number
  createdAt: string
}

// Create the migrations array
const migrations: Migration[] = [
  {
    id: "comment-system-v1",
    name: "Comment System Enhancements",
    description: "Adds support for threaded comments and editing",
    sql: COMMENT_SYSTEM_MIGRATION,
    version: 1,
    createdAt: "2024-05-17T00:00:00Z",
  },
  // Add more migrations as needed
]

export default migrations
