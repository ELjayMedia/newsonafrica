import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // SQL to create the column_exists function
    const sql = `
      -- Function to check if a column exists in a table
      CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
      RETURNS TABLE(exists boolean) AS $$
      BEGIN
        RETURN QUERY SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = $1
          AND column_name = $2
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", { sql })

    if (error) {
      // If the exec_sql function doesn't exist, we need to create it first
      if (error.message.includes("function exec_sql() does not exist")) {
        const createExecSql = `
          CREATE OR REPLACE FUNCTION exec_sql(sql text)
          RETURNS void AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `

        // Create the exec_sql function
        const { error: createError } = await supabase.rpc("exec_sql", { sql: createExecSql })

        if (createError) {
          // If we still can't create it, we need admin privileges
          return NextResponse.json(
            {
              error:
                "Could not create helper functions. Please run this SQL in the Supabase SQL editor with admin privileges.",
              sql: sql,
            },
            { status: 500 },
          )
        }

        // Try again with the original SQL
        const { error: retryError } = await supabase.rpc("exec_sql", { sql })

        if (retryError) {
          return NextResponse.json(
            { error: "Failed to create column_exists function", details: retryError },
            { status: 500 },
          )
        }
      } else {
        return NextResponse.json({ error: "Failed to create column_exists function", details: error }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error setting up column check:", error)
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 })
  }
}
