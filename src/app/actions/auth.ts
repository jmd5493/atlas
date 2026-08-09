"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasSupabaseConfig } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
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

export interface ChangePasswordFormState {
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
        "Add SUPABASE_URL and SUPABASE_ANON_KEY to .env.local first.",
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
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password || !displayName) {
    return { message: "Name, email, and password are required.", tone: "error" };
  }

  if (password.length < 8) {
    return { message: "Password must be at least 8 characters.", tone: "error" };
  }

  if (!hasSupabaseConfig()) {
    return {
      message: "Add SUPABASE_URL and SUPABASE_ANON_KEY to .env.local first.",
      tone: "error",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // Public signup can only ever create client accounts. This is also
        // enforced in the DB trigger (handle_new_user_profile, migration
        // 009) which never reads role from user metadata — that's the real
        // boundary, since raw_user_meta_data is client-controlled input
        // reachable by anyone with the anon key, not just this form.
        // Setting it here too keeps intent explicit and harmless either
        // way.
        role: "client",
        // Picked up by the same trigger as the profile's display_name,
        // falling back to the email's local part only if this is ever
        // empty (see migration 001) — this form requires it, but the
        // trigger's fallback stays as defense in depth for any other path
        // that creates an auth user (e.g. a future admin-invite flow).
        display_name: displayName,
      },
    },
  });

  if (error) {
    // Older/some Supabase configs return an explicit error for a
    // already-registered email; match loosely rather than on exact text,
    // which Supabase doesn't guarantee stays stable across versions.
    if (/already registered|already exists/i.test(error.message)) {
      return {
        message:
          "An account already exists for that email. Try signing in instead.",
        tone: "error",
      };
    }

    return { message: error.message, tone: "error" };
  }

  // With "Confirm email" on and the target email already belonging to a
  // confirmed user, Supabase deliberately returns success with no error —
  // a fake user object with an empty identities array — instead of an
  // error, specifically to avoid leaking which emails are registered via
  // signup's response. Surface that case clearly rather than showing the
  // generic "check your email" message, which would otherwise be actively
  // misleading (no new account was created, and the real owner likely
  // gets no email either).
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      message:
        "An account already exists for that email. Try signing in instead.",
      tone: "error",
    };
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

  // Keyed by the submitted email, not caller IP: this form is reachable
  // without auth, and repeated submissions against one email are the
  // actual abuse case worth limiting (Supabase's own rate limits are
  // per-project, not per-target-email). Checked before the "does this
  // email exist" logic runs, and returns a message that's the same
  // regardless of whether the email is registered — same
  // don't-become-an-enumeration-oracle reasoning as the rest of this
  // function.
  const allowed = checkRateLimit(`forgot-password:${email.toLowerCase()}`, 3, 15 * 60 * 1000);

  if (!allowed) {
    return {
      message: "Too many requests for that email. Try again in a few minutes.",
      tone: "error",
    };
  }

  if (!hasSupabaseConfig()) {
    return {
      message: "Add SUPABASE_URL and SUPABASE_ANON_KEY to .env.local first.",
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

export async function changePassword(
  _state: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!newPassword || !confirmPassword) {
    return { message: "Fill in both password fields.", tone: "error" };
  }

  if (newPassword.length < 8) {
    return { message: "Password must be at least 8 characters.", tone: "error" };
  }

  if (newPassword !== confirmPassword) {
    return { message: "Passwords do not match.", tone: "error" };
  }

  if (!hasSupabaseConfig()) {
    return {
      message: "Add SUPABASE_URL and SUPABASE_ANON_KEY to .env.local first.",
      tone: "error",
    };
  }

  const supabase = await createSupabaseServerClient();

  // No separate "current password" check here: this runs from inside
  // /dashboard, already gated on an active session by the dashboard
  // layout — the session itself is the authorization, same trust boundary
  // Supabase's own updateUser() relies on. Matches the existing
  // reset-password flow (src/components/auth/reset-password-form.tsx),
  // which also updates on session alone once its recovery link is valid.
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { message: error.message, tone: "error" };
  }

  return { message: "Password updated.", tone: "info" };
}

export async function signOut() {
  if (!hasSupabaseConfig()) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}