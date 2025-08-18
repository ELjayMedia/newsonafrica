import logger from "@/utils/logger";
import env from "@/lib/config/env";
import { ApolloServer } from "@apollo/server"
import { startServerAndCreateNextHandler } from "@as-integrations/next"
import type { NextRequest } from "next/server"
import { typeDefs } from "@/graphql/schema"
import { resolvers } from "@/graphql/resolvers"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: env.NODE_ENV !== "production",
  formatError: (error) => {
    // Don't expose internal server errors to clients in production
    if (env.NODE_ENV === "production" && error.extensions?.code === "INTERNAL_SERVER_ERROR") {
      return {
        message: "Internal server error",
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      }
    }
    return error
  },
})

// Context function to extract user from request
async function createContext({ req }: { req: NextRequest }) {
  // Get the token from the Authorization header
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!token) {
    return { user: null }
  }

  try {
    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { user: null }
    }

    return { user }
  } catch (error) {
    logger.error("Error verifying token:", error)
    return { user: null }
  }
}

// Create and export the API handler
const handler = startServerAndCreateNextHandler(server, {
  context: createContext,
})

export { handler as GET, handler as POST }
