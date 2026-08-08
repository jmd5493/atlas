export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// NEXT_PUBLIC_* vars are only inlined into the browser bundle when accessed
// as a static, literal `process.env.NEXT_PUBLIC_X` — Next.js's build-time
// replacement can't follow a dynamic/computed key. Reading them through a
// `process.env[name]` helper (the previous shape here) works fine
// server-side, where a real process.env exists at runtime, but silently
// breaks in any client component: the browser has no process.env at all, so
// every lookup comes back undefined. Keep both reads as literal statements.
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url, anonKey };
}
