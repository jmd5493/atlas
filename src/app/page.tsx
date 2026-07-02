export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f2efe8_0,_#f7f4ee_38%,_#fcfbf8_100%)] px-5 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col rounded-[2rem] border border-stone-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(32,26,18,0.08)] backdrop-blur sm:p-8 lg:p-10">
        <header className="flex items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
              Atlas
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Fitness coaching, kept simple.
            </h1>
          </div>
          <div className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600">
            MVP foundation
          </div>
        </header>

        <section className="grid flex-1 gap-8 py-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="max-w-xl text-base leading-7 text-stone-700 sm:text-lg">
                Atlas is being set up as a clean, mobile-first platform for one
                trainer and their clients. The first release focuses on login,
                client management, workout assignment, exercise logging, and
                workout history.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
                  href="/login"
                >
                  Open login
                </a>
                <a
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
                  href="/dashboard"
                >
                  View dashboard gate
                </a>
              </div>
            </div>

            <div id="mvp-scope" className="grid gap-4 sm:grid-cols-2">
              {[
                "Authentication and role-based access",
                "Trainer-managed client records",
                "Workout program creation and assignment",
                "Client workout logging and history",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 text-sm leading-6 text-stone-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-300">
              Build order
            </p>
            <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-200">
              <li>1. Authentication with trainer and client roles</li>
              <li>2. Client management screens for the trainer</li>
              <li>3. Workout program creation and assignment</li>
              <li>4. Client logging and workout history</li>
              <li>5. Trainer review of client workout logs</li>
            </ol>
          </aside>
        </section>

        <section
          id="project-structure"
          className="grid gap-4 border-t border-stone-200 pt-6 text-sm text-stone-700 lg:grid-cols-4"
        >
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="font-semibold text-slate-900">src/app</p>
            <p className="mt-2 leading-6">
              App Router pages, layouts, and route groups for public, auth, and
              dashboard flows.
            </p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="font-semibold text-slate-900">src/components</p>
            <p className="mt-2 leading-6">
              Reusable UI shared across trainer and client screens.
            </p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="font-semibold text-slate-900">src/lib</p>
            <p className="mt-2 leading-6">
              Shared utilities and server-side integrations, starting with
              auth and Supabase helpers.
            </p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4">
            <p className="font-semibold text-slate-900">src/types</p>
            <p className="mt-2 leading-6">
              Readable TypeScript types for users, clients, programs, and logs.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
