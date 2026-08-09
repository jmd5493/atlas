"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LinkStatus = "checking" | "ready" | "invalid";

export function ResetPasswordForm() {
  const router = useRouter();
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "info">("error");
  const [pending, setPending] = useState(false);
  // Client creation is now async (it fetches runtime config from
  // /api/public-env — see src/lib/supabase/client.ts), so it can't be
  // created inline via useRef the way a sync call could. Set up inside the
  // effect below instead; handleSubmit relies on linkStatus being "ready"
  // (only reachable after this resolves) before this ref is read.
  const supabaseRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    createSupabaseBrowserClient().then((supabase) => {
      if (cancelled) return;
      supabaseRef.current = supabase;

      // The recovery link's token/code lives in the URL. supabase-js
      // exchanges it for a session automatically on client init
      // (detectSessionInUrl) and fires PASSWORD_RECOVERY once that's done —
      // this has to happen in the browser client, a server component never
      // sees the URL fragment/code exchange. getSession() covers the case
      // where the exchange already finished before this effect subscribed.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setLinkStatus("ready");
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setLinkStatus("ready");
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    });

    const timeout = setTimeout(() => {
      setLinkStatus((current) => (current === "checking" ? "invalid" : current));
    }, 4000);

    return () => {
      cancelled = true;
      unsubscribe?.();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setTone("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setTone("error");
      setMessage("Passwords do not match.");
      return;
    }

    const supabase = supabaseRef.current;
    if (!supabase) {
      // Shouldn't happen — the form only renders once linkStatus is
      // "ready", which only happens after this ref is set — but keep the
      // UI honest if it somehow does.
      setTone("error");
      setMessage("Still loading your session, try again in a moment.");
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) {
      setTone("error");
      setMessage(error.message);
      return;
    }

    setTone("info");
    setMessage("Password updated. Redirecting...");
    router.push("/dashboard");
    router.refresh();
  }

  if (linkStatus === "checking") {
    return <p className="text-sm text-stone-600">Checking your reset link…</p>;
  }

  if (linkStatus === "invalid") {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This reset link is invalid or has expired.
        </p>
        <a href="/forgot-password" className="text-sm font-medium text-gold-deep underline">
          Request a new link
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-deep"
          placeholder="At least 8 characters"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-deep"
          placeholder="Re-enter your new password"
          required
        />
      </div>

      {message ? (
        <p
          className={
            tone === "info"
              ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-gold-deep px-5 py-3 text-sm font-medium text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {pending ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
