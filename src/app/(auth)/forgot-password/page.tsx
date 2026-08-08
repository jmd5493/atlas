import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentSession } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/env";

export default async function ForgotPasswordPage() {
  const isConfigured = hasSupabaseConfig();
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center rounded-[2rem] border border-white/10 bg-white/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8 lg:p-10">
        <section className="w-full max-w-md rounded-[1.75rem] border border-stone-200 bg-mist p-6 sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
              Atlas auth
            </p>
            <h1 className="text-xl font-semibold text-ink">Reset your password</h1>
            <p className="text-sm leading-6 text-stone-600">
              Enter the email on your account and we&rsquo;ll send a link to set a
              new password.
            </p>
          </div>
          {isConfigured ? (
            <ForgotPasswordForm />
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-900">
              Add your Supabase project URL and anon key to `.env.local`, then
              refresh this page.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
