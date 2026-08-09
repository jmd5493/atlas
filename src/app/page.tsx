export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-10 sm:px-6">
      <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-white/95 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-10 lg:p-12">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
          Atlas
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Fitness coaching, kept simple.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-stone-700 sm:text-lg">
          Your coaching workspace for programs, workout logging, and progress —
          in one place for you and your clients.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex items-center justify-center rounded-full bg-gold-deep px-6 py-3 text-sm font-medium text-white transition hover:bg-ink"
            href="/login"
          >
            Sign in
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
            href="/signup"
          >
            Create a client account
          </a>
        </div>

        <div className="mt-10 grid gap-4 border-t border-stone-200 pt-8 sm:grid-cols-2">
          <div className="rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-700">
            <p className="font-semibold text-ink">For clients</p>
            <p className="mt-1">
              Log workouts against your plan, track your history, and see
              what&rsquo;s next.
            </p>
          </div>
          <div className="rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-700">
            <p className="font-semibold text-ink">For your trainer</p>
            <p className="mt-1">
              Build programs, review client progress, and keep everyone on
              track.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
