"use client";

import { useActionState } from "react";

import { signIn, type LoginFormState } from "@/app/actions/auth";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-deep"
          placeholder="trainer@atlas.app"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-gold-deep"
          placeholder="••••••••"
          required
        />
      </div>

      {state.message ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-gold-deep px-5 py-3 text-sm font-medium text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}