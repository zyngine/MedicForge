import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

// Singleton instance to prevent multiple clients
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
