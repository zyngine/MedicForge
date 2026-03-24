import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Admin client for server-side operations that bypass RLS
// Only use this in API routes and server actions where you need to bypass RLS
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("Failed to initialize admin client: missing server configuration");
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }

  if (!serviceRoleKey) {
    console.error("Failed to initialize admin client: missing server configuration");
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// CE platform admin client — untyped until types are regenerated from Supabase.
// Type definitions exist in @/types/ce-database.types.ts for reference.
// To enable: run `supabase gen types typescript` and replace this with a typed client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCEAdminClient(): any {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("Failed to initialize admin client: missing server configuration");
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }

  if (!serviceRoleKey) {
    console.error("Failed to initialize admin client: missing server configuration");
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
