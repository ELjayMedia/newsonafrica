import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

import { resolvers } from '@/graphql/resolvers';
import { typeDefs } from '@/graphql/schema';

export const runtime = 'nodejs';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  formatError: (error) => {
    // Don't expose internal server errors to clients in production
    if (
      process.env.NODE_ENV === 'production' &&
      error.extensions?.code === 'INTERNAL_SERVER_ERROR'
    ) {
      return {
        message: 'Internal server error',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };
    }
    return error;
  },
});

// Context function to extract user from request
async function createContext({ req }: { req: NextRequest }) {
  // Get the token from the Authorization header
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { user: null };
  }

  try {
    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null };
    }

    return { user };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { user: null };
  }
}

// Create and export the API handler
const handler = startServerAndCreateNextHandler(server, {
  context: createContext,
});

export async function GET(
  request: NextRequest,
  _ctx: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  return handler(request);
}

export async function POST(
  request: NextRequest,
  _ctx: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  return handler(request);
}
