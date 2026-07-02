import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseConfig();

  return createBrowserClient(url, anonKey);
}