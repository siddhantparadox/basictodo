import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@basictodo/db';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

/**
 * Browser-safe Supabase client with anonymous key
 * Use this in client-side code and server components
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Server-only Supabase client with service role key
 * Use this in API routes and server actions that need elevated permissions
 * WARNING: Never expose this client to the browser
 */
export const supabaseAdmin: SupabaseClient<Database> | null = 
  SUPABASE_SERVICE_ROLE_KEY 
    ? createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

/**
 * Create a Supabase client with a specific JWT token
 * Useful for serverless functions that receive a user's JWT
 */
export function createSupabaseClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Helper to get the current user from a Supabase client
 */
export async function getCurrentUser(client: SupabaseClient<Database>) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(client: SupabaseClient<Database>): Promise<boolean> {
  try {
    const user = await getCurrentUser(client);
    return !!user;
  } catch {
    return false;
  }
}