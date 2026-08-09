import { NextResponse } from "next/server";

import { getSupabaseConfig, hasSupabaseConfig } from "@/lib/env";

// The bridge between the container's real, live env vars and the browser.
// SUPABASE_URL/SUPABASE_ANON_KEY are plain server env vars (see
// src/lib/env.ts for why), so they're never present in the client JS
// bundle — the one place that needs them in the browser
// (src/lib/supabase/client.ts) fetches them from here instead. Forced
// dynamic so this always reads the container's actual env at request time,
// never gets statically optimized/cached into a build-time snapshot.
export const dynamic = "force-dynamic";

// Belt-and-suspenders alongside `dynamic`: an explicit no-store header stops
// a browser or intermediary proxy from caching this response across a
// redeploy/env change, which `dynamic` alone doesn't guarantee for every
// caller. Applied to both the success and error responses.
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase is not configured on this server." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const { url, anonKey } = getSupabaseConfig();

  return NextResponse.json(
    { supabaseUrl: url, supabaseAnonKey: anonKey },
    { headers: NO_STORE_HEADERS },
  );
}
