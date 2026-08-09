import { createBrowserClient } from "@supabase/ssr";

// SUPABASE_URL/SUPABASE_ANON_KEY are plain server env vars (see
// src/lib/env.ts) — there's no process.env to read in the browser, so the
// only way to get them here is to ask the server for them, live, on every
// call. See src/app/api/public-env/route.ts for the other end of this.
export async function createSupabaseBrowserClient() {
  const response = await fetch("/api/public-env");

  if (!response.ok) {
    throw new Error("Failed to load Supabase configuration.");
  }

  const { supabaseUrl, supabaseAnonKey } = (await response.json()) as {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}