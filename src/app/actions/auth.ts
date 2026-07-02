"use server";

import { redirect } from "next/navigation";

import { hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginFormState {
  message?: string;
}

export async function signIn(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      message: "Email and password are required.",
    };
  }

  if (!hasSupabaseConfig()) {
    return {
      message:
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local first.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      message: error.message,
    };
  }

  redirect("/dashboard");
}

export async function signOut() {
  if (!hasSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}