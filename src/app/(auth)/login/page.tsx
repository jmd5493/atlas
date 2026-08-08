import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/env";

export default async function LoginPage() {
  const isConfigured = hasSupabaseConfig();
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center rounded-[2rem] border border-white/10 bg-white/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8 lg:p-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
              Atlas auth
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Sign in to the coaching workspace.
            </h1>
            <p className="max-w-xl text-base leading-7 text-stone-700 sm:text-lg">
              This first slice keeps auth simple: Supabase email and password
              sign-in, a protected dashboard route, and a lightweight role hook
              for trainer and client access later.
            </p>
            <div className="grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-mist p-4">
                Trainer and client roles are planned as the authorization gate.
              </div>
              <div className="rounded-2xl border border-stone-200 bg-mist p-4">
                Fill `.env.local` with your Supabase URL and anon key before signing in.
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-stone-200 bg-mist p-6 sm:p-8">
            <div className="mb-6 space-y-2">
              <h2 className="text-xl font-semibold text-ink">Login</h2>
              <p className="text-sm leading-6 text-stone-600">
                Use a Supabase Auth user from your project.
              </p>
            </div>
            {isConfigured ? (
              <LoginForm />
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-900">
                Add your Supabase project URL and anon key to `.env.local`, then
                refresh this page to sign in.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}