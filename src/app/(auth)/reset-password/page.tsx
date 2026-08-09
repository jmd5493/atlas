import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { hasSupabaseConfig } from "@/lib/env";

// Deliberately no session redirect here (unlike login/signup/forgot-password):
// this page's whole job is to consume a recovery link and establish a fresh
// session client-side, which has to run regardless of whatever session
// cookie is already present when the page is first requested.
//
// Forced dynamic: this is otherwise the one page with no dynamic API call
// (login/signup/forgot-password get this for free via getCurrentSession()'s
// cookies() read), so without this Next.js would statically prerender it at
// build time — freezing hasSupabaseConfig()'s result into the build instead
// of reading the container's actual env at request time.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const isConfigured = hasSupabaseConfig();

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center rounded-[2rem] border border-white/10 bg-white/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8 lg:p-10">
        <section className="w-full max-w-md rounded-[1.75rem] border border-stone-200 bg-mist p-6 sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
              Atlas auth
            </p>
            <h1 className="text-xl font-semibold text-ink">Set a new password</h1>
          </div>
          {isConfigured ? (
            <ResetPasswordForm />
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
