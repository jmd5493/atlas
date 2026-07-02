import { signOut } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";

function TrainerHome() {
  return (
    <section className="mt-6 rounded-[1.5rem] bg-slate-950 p-6 text-white">
      <h2 className="text-lg font-semibold">Trainer workspace</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
        Next step is building trainer-first flows to create clients, create
        programs, and assign workouts.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/clients"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-white/20"
        >
          Create clients
        </Link>
        <Link
          href="/dashboard/programs"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-white/20"
        >
          Create programs
        </Link>
        <Link
          href="/dashboard/client-logs"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-white/20"
        >
          Review workout logs
        </Link>
      </div>
    </section>
  );
}

function ClientHome() {
  return (
    <section className="mt-6 rounded-[1.5rem] bg-emerald-950 p-6 text-emerald-50">
      <h2 className="text-lg font-semibold">Client workspace</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100">
        You are in the client view. Next step is to add workout assignment,
        exercise logging, and workout history screens.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/workouts"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-white/20"
        >
          Assigned workouts
        </Link>
        <Link
          href="/dashboard/logs"
          className="rounded-xl bg-white/10 p-3 text-sm transition hover:bg-white/20"
        >
          Log exercises
        </Link>
        <div className="rounded-xl bg-white/10 p-3 text-sm">Workout history</div>
      </div>
    </section>
  );
}

function RoleNotSet() {
  return (
    <section className="mt-6 rounded-[1.5rem] border border-amber-300 bg-amber-50 p-6 text-amber-900">
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
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fcfbf8_0%,_#f4efe4_100%)] px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(32,26,18,0.08)] sm:p-8">
        <div className="flex flex-col gap-6 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
              Protected dashboard
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              You are signed in.
            </h1>
            <p className="text-sm leading-6 text-stone-600">
              This is the gate for future trainer and client application flows.
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
            >
              Sign out
            </button>
          </form>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-stone-50 p-5">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">
              Signed-in user
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-950">
              {currentUser.user.email}
            </p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-5">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">
              Current role
            </p>
            <p className="mt-3 text-lg font-semibold capitalize text-slate-950">
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