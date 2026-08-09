export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-white/95 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
          Atlas
        </p>
        <h1 className="mt-3 text-xl font-semibold text-ink">Page not found.</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          That page doesn&rsquo;t exist, or you don&rsquo;t have access to it.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gold-deep px-5 py-3 text-sm font-medium text-white transition hover:bg-ink"
        >
          Back to dashboard
        </a>
      </div>
    </main>
  );
}
