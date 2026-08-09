// Guarantees a build/type error if anything ever imports this file from a
// client component, instead of a silent runtime failure — the browser has
// no process.env at all, so a client-side call to getSupabaseConfig() would
// otherwise just throw "Missing required environment variable" with no clue
// why. Client code gets these values via a fetch to /api/public-env instead
// (src/lib/supabase/client.ts), never by importing this file directly.
import "server-only";

export function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

// Deliberately plain server env vars, not NEXT_PUBLIC_*: NEXT_PUBLIC_ vars
// get inlined into the client JS bundle at `next build` time, which would
// mean a different Docker image per environment. This app builds one image
// and reconfigures which Supabase project it talks to at container start
// (see the Dockerfile and src/app/api/public-env/route.ts).
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
