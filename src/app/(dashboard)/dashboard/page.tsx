import { signOut } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";

function TrainerHome() {
  return (
    <section className="mt-6 rounded-[1.5rem] bg-ink p-6 text-white">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold">
        Trainer workspace
      </p>
      <h2 className="mt-2 text-lg font-semibold">Run your coaching business</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
        Manage your clients, build programs, and review submitted workout logs.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/clients"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-gold-deep/30"
        >
          Manage clients
        </Link>
        <Link
          href="/dashboard/programs"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-gold-deep/30"
        >
          Manage programs
        </Link>
        <Link
          href="/dashboard/client-logs"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-gold-deep/30"
        >
          Review workout logs
        </Link>
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-[0.24em] text-gold">
        Your own training
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-300">
        Optional: link yourself as a client on the clients page to track your
        own workouts the same way your clients do.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/workouts"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-gold-deep/30"
        >
          My assigned workouts
        </Link>
        <Link
          href="/dashboard/logs"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-gold-deep/30"
        >
          Log something extra
        </Link>
      </div>
    </section>
  );
}

function ClientHome() {
  return (
    <section className="mt-6 rounded-[1.5rem] bg-ink p-6 text-white">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold">
        Client workspace
      </p>
      <h2 className="mt-2 text-lg font-semibold">Stay on track</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
        View your assigned workouts, log completed exercises, and track your training history.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/workouts"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-gold-deep/30"
        >
          Assigned workouts
        </Link>
        <Link
          href="/dashboard/logs"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-gold-deep/30"
        >
          Log something extra
        </Link>
        <div className="rounded-xl bg-white/10 p-3 text-sm">Workout history</div>
      </div>
    </section>
  );
}

function RoleNotSet() {
  return (
    <section className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 p-6 text-red-900">
      <h2 className="text-lg font-semibold">Role not assigned</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6">
        Your account does not have a role in profiles yet. Set role to
        trainer or client in Supabase to unlock the correct dashboard flow.
      </p>
    </section>
  );
}

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="flex flex-col gap-6 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
              Atlas dashboard
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Welcome back
            </h1>
            <p className="text-sm leading-6 text-stone-600">
              Your workspace updates based on your account role.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/account"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
            >
              Account settings
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-mist p-5">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">
              Signed-in user
            </p>
            <p className="mt-3 text-lg font-semibold text-ink">
              {currentUser.user.email}
            </p>
          </div>
          <div className="rounded-2xl bg-mist p-5">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">
              Current role
            </p>
            <p className="mt-3 text-lg font-semibold capitalize text-ink">
              {currentUser.role ?? "not set"}
            </p>
          </div>
        </section>

        {currentUser.role === "trainer" ? <TrainerHome /> : null}
        {currentUser.role === "client" ? <ClientHome /> : null}
        {!currentUser.role ? <RoleNotSet /> : null}
      </div>
    </main>
  );
}