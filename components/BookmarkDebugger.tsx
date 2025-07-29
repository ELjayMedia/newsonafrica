"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthProvider"
import { useBookmarks } from "@/contexts/BookmarksContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"

export function BookmarkDebugger() {
  const { user } = useAuth()
  const { bookmarks, refreshBookmarks } = useBookmarks()
  const [dbStatus, setDbStatus] = useState<string>("Not checked")
  const [tableInfo, setTableInfo] = useState<any>(null)
  const supabase = createClient()

  const checkDatabase = async () => {
    try {
      setDbStatus("Checking...")
      const { data, error } = await supabase.from("bookmarks").select("*").limit(1)

      if (error) {
        console.error("Database error:", error)
        setDbStatus(`Error: ${error.message}`)
        return
      }

      setDbStatus("Connected successfully")
    } catch (error: any) {
      console.error("Error checking database:", error)
      setDbStatus(`Error: ${error.message}`)
    }
  }

  const checkTableStructure = async () => {
    try {
      setTableInfo("Checking...")
      // This is a workaround to get table structure since Supabase doesn't expose schema directly
      const { data, error } = await supabase.rpc("get_table_info", { table_name: "bookmarks" })

      if (error) {
        console.error("Table info error:", error)
        setTableInfo(`Error: ${error.message}`)
        return
      }

      setTableInfo(data || "Table exists but couldn't get structure")
    } catch (error: any) {
      console.error("Error checking table structure:", error)
      setTableInfo(`Error: ${error.message}`)
    }
  }

  const testAddBookmark = async () => {
    try {
      if (!user) {
        alert("You must be logged in to test this")
        return
      }

      const testBookmark = {
        user_id: user.id,
        post_id: `test-${Date.now()}`,
        title: "Test Bookmark",
        slug: "test-bookmark",
        excerpt: "This is a test bookmark",
        featuredImage: null,
      }

      const { data, error } = await supabase.from("bookmarks").insert(testBookmark).select().single()

      if (error) {
        console.error("Test bookmark error:", error)
        alert(`Error: ${error.message}`)
        return
      }

      alert("Test bookmark added successfully!")
      refreshBookmarks()
    } catch (error: any) {
      console.error("Error adding test bookmark:", error)
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Bookmark Debugger</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p>
              <strong>User:</strong> {user ? user.id : "Not logged in"}
            </p>
            <p>
              <strong>Bookmarks count:</strong> {bookmarks.length}
            </p>
            <p>
              <strong>Database status:</strong> {dbStatus}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={checkDatabase} variant="outline">
              Check Database
            </Button>
            <Button onClick={checkTableStructure} variant="outline">
              Check Table Structure
            </Button>
            <Button onClick={testAddBookmark} variant="outline">
              Test Add Bookmark
            </Button>
            <Button onClick={refreshBookmarks} variant="outline">
              Refresh Bookmarks
            </Button>
          </div>

          {tableInfo && (
            <div className="mt-4">
              <h3 className="text-sm font-medium">Table Information:</h3>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                {typeof tableInfo === "string" ? tableInfo : JSON.stringify(tableInfo, null, 2)}
              </pre>
            </div>
          )}

          {bookmarks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium">Current Bookmarks:</h3>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(bookmarks, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Create an RPC function in Supabase to get table info
// This needs to be added to your Supabase SQL editor:
/*
CREATE OR REPLACE FUNCTION get_table_info(table_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'columns', jsonb_agg(
        jsonb_build_object(
          'column_name', column_name,
          'data_type', data_type,
          'is_nullable', is_nullable
        )
      ),
      'policies', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'policyname', policyname,
            'permissive', permissive,
            'roles', roles,
            'cmd', cmd,
            'qual', qual,
            'with_check', with_check
          )
        )
        FROM pg_policies
        WHERE tablename = table_name
      )
    ) INTO result
  FROM information_schema.columns
  WHERE table_name = table_name;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_table_info TO authenticated;
*/
