"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasSupabaseConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginFormState {
  message?: string;
}

export interface SignupFormState {
  message?: string;
  tone?: "error" | "info";
}

export interface ForgotPasswordFormState {
  message?: string;
  tone?: "error" | "info";
}

// Builds an absolute origin from the incoming request's own headers rather
// than a hardcoded env var, so email redirect links work unchanged across
// local dev / Hetzner staging / AWS prod without per-environment config.
async function currentOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
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

export async function signUp(
  _state: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { message: "Email and password are required.", tone: "error" };
  }

  if (password.length < 8) {
    return { message: "Password must be at least 8 characters.", tone: "error" };
  }

  if (!hasSupabaseConfig()) {
    return {
      message: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local first.",
      tone: "error",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Public signup can only ever create client accounts. This is also
      // enforced in the DB trigger (handle_new_user_profile, migration 009)
      // which never reads role from user metadata — that's the real
      // boundary, since raw_user_meta_data is client-controlled input
      // reachable by anyone with the anon key, not just this form. Setting
      // it here too keeps intent explicit and harmless either way.
      data: { role: "client" },
    },
  });

  if (error) {
    return { message: error.message, tone: "error" };
  }

  // Supabase's project auth settings decide whether email confirmation is
  // required. When it is, signUp() succeeds but returns no session yet —
  // handle both cases rather than assuming one.
  if (!data.session) {
    return {
      message: `Account created. Check ${email} for a confirmation link before signing in.`,
      tone: "info",
    };
  }

  redirect("/dashboard");
}

export async function requestPasswordReset(
  _state: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { message: "Enter your email address.", tone: "error" };
  }

  if (!hasSupabaseConfig()) {
    return {
      message: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local first.",
      tone: "error",
    };
  }

  const origin = await currentOrigin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return { message: error.message, tone: "error" };
  }

  // Supabase doesn't reveal whether the email exists either, so keep this
  // message the same regardless — don't let it become an account-enumeration
  // oracle.
  return {
    message: `If an account exists for ${email}, a password reset link is on its way.`,
    tone: "info",
  };
}

export async function signOut() {
  if (!hasSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}