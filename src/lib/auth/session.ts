import { cache } from "react";

import { hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  role: "trainer" | "client";
  display_name: string;
};

export const getCurrentSession = cache(async () => {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", session.user.id)
    .maybeSingle<ProfileRow>();

  return {
    user: session.user,
    role: profile?.role ?? null,
    displayName: profile?.display_name ?? null,
  };
});