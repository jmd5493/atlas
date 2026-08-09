export function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

// Deliberately plain server env vars, not NEXT_PUBLIC_*: NEXT_PUBLIC_ vars
// get inlined into the client JS bundle at `next build` time, which would
// mean a different Docker image per environment. This app builds one image
// and reconfigures which Supabase project it talks to at container start
// (see the Dockerfile and src/app/api/public-env/route.ts). Only ever call
// this function on the server — the browser has no process.env at all, so
// client code gets these values via a fetch to /api/public-env instead
// (src/lib/supabase/client.ts), never by importing this file directly.
export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing required environment variable: SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error("Missing required environment variable: SUPABASE_ANON_KEY");
  }

  return { url, anonKey };
}
