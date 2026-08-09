import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AccountPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="space-y-2 border-b border-stone-200 pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
            Atlas dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Account settings
          </h1>
          <p className="text-sm leading-6 text-stone-600">
            Signed in as {currentUser.user.email}.
          </p>
        </div>

        <section className="mt-6 rounded-2xl bg-mist p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">Change password</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Update your password without needing an email link.
          </p>
          <div className="mt-5 max-w-md">
            <ChangePasswordForm />
          </div>
        </section>

        <a
          href="/dashboard"
          className="mt-6 inline-block text-sm font-medium text-gold-deep underline"
        >
          Back to dashboard
        </a>
      </div>
    </main>
  );
}
