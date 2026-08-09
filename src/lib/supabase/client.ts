import { createBrowserClient } from "@supabase/ssr";

// SUPABASE_URL/SUPABASE_ANON_KEY are plain server env vars (see
// src/lib/env.ts) — there's no process.env to read in the browser, so the
// only way to get them here is to ask the server for them, live, on every
// call. See src/app/api/public-env/route.ts for the other end of this.
export async function createSupabaseBrowserClient() {
  // no-store on top of the endpoint's own Cache-Control: no-store — belt
  // and suspenders against a browser/intermediary serving a stale config
  // across a redeploy or env change.
  const response = await fetch("/api/public-env", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load Supabase configuration.");
  }

  const payload: unknown = await response.json();

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as Record<string, unknown>).supabaseUrl !== "string" ||
    typeof (payload as Record<string, unknown>).supabaseAnonKey !== "string" ||
    !(payload as Record<string, unknown>).supabaseUrl ||
    !(payload as Record<string, unknown>).supabaseAnonKey
  ) {
    throw new Error("Received malformed Supabase configuration from the server.");
  }

  const { supabaseUrl, supabaseAnonKey } = payload as {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
