"use client";

import { useEffect } from "react";

// Catches errors thrown anywhere inside a route segment (any page under
// src/app except the root layout itself — see global-error.tsx for that
// case). Without this, Next.js falls back to its bare default error
// screen, which doesn't look like part of the product at all — not
// acceptable for something real clients hit.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side console for now — a real error-tracking service (Sentry
    // or similar) is a reasonable follow-up once this is live, not before.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-white/95 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
          Atlas
        </p>
        <h1 className="mt-3 text-xl font-semibold text-ink">
          Something went wrong.
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          That&rsquo;s on us, not something you did. Try again, or come back
          in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gold-deep px-5 py-3 text-sm font-medium text-white transition hover:bg-ink"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="mt-3 block text-sm font-medium text-gold-deep underline"
        >
          Back to dashboard
        </a>
      </div>
    </main>
  );
}
