import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

// Singleton instance to prevent multiple clients
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // During Next.js static generation, env vars may not be available.
    // Return a dummy client that will fail gracefully at runtime.
    if (typeof window === "undefined") {
      return createBrowserClient<Database>(
        "https://placeholder.supabase.co",
        "placeholder-key"
      ) as ReturnType<typeof createBrowserClient<Database>>;
    }
    throw new Error("Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  browserClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  );

  return browserClient;
}

// CE platform: untyped because ce_* tables are not yet in database.types.ts
// TODO: regenerate database.types.ts after CE schema is stable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCEClient(): any {
  return createClient();
}
