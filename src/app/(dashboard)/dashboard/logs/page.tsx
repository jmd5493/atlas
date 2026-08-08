import Link from "next/link";
import { redirect } from "next/navigation";

import { createExerciseLog } from "@/app/actions/logs";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type LinkedClientRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type ProgramOption = {
  id: string;
  title: string;
};

type ExerciseLogRow = {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
  performed_on: string;
  created_at: string;
  workout_programs: {
    title: string;
  } | null;
};

function getStatusMessage(
  status: string | undefined,
  errorCode: string | undefined,
  errorMessage: string | undefined,
) {
  switch (status) {
    case "created":
      return { tone: "success", text: "Workout log saved." };
    case "missing-fields":
      return { tone: "error", text: "Fill in exercise name, sets, reps, and date." };
    case "invalid-numbers":
      return { tone: "error", text: "Sets and reps must be positive whole numbers." };
    case "not-linked":
      return {
        tone: "error",
        text: "Your auth user is not linked to a client record yet. Ask trainer to link it first.",
      };
    case "create-failed":
      return {
        tone: "error",
        text: `Log creation failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    case "forbidden":
      return { tone: "error", text: "Only client accounts can add exercise logs." };
    default:
      return null;
  }
}

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const statusValue = resolvedParams?.status;
  const status = Array.isArray(statusValue) ? statusValue[0] : statusValue;
  const errorCodeValue = resolvedParams?.errorCode;
  const errorCode = Array.isArray(errorCodeValue) ? errorCodeValue[0] : errorCodeValue;
  const errorMessageValue = resolvedParams?.errorMessage;
  const errorMessage = Array.isArray(errorMessageValue) ? errorMessageValue[0] : errorMessageValue;
  const statusMessage = getStatusMessage(status, errorCode, errorMessage);

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "client") {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();

  const { data: linkedClient } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("auth_user_id", currentUser.user.id)
    .maybeSingle<LinkedClientRow>();

  if (!linkedClient) {
    return (
      <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-4xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
          <h1 className="text-2xl font-semibold text-ink">Log workouts</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Your login is not linked to a client record yet. Ask your trainer to link
            your auth user to your client profile.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { data: programs } = await supabase
    .from("workout_programs")
    .select("id, title")
    .eq("client_id", linkedClient.id)
    .order("created_at", { ascending: false })
    .returns<ProgramOption[]>();

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("id, exercise_name, sets, reps, weight, notes, performed_on, created_at, workout_programs(title)")
    .eq("client_id", linkedClient.id)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ExerciseLogRow[]>();

  const safePrograms = programs ?? [];
  const safeLogs = logs ?? [];

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-700">
              Client logs
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              Log workouts and history
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Logging for {linkedClient.first_name} {linkedClient.last_name}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <h2 className="text-lg font-semibold text-ink">Add workout log</h2>

            {statusMessage ? (
              <div
                className={
                  statusMessage.tone === "success"
                    ? "mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                    : "mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                }
              >
                {statusMessage.text}
              </div>
            ) : null}

            <form action={createExerciseLog} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="exerciseName" className="text-sm font-medium text-stone-700">
                  Exercise name
                </label>
                <input
                  id="exerciseName"
                  name="exerciseName"
                  required
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="sets" className="text-sm font-medium text-stone-700">
                    Sets
                  </label>
                  <input
                    id="sets"
                    name="sets"
                    type="number"
                    min={1}
                    required
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reps" className="text-sm font-medium text-stone-700">
                    Reps
                  </label>
                  <input
                    id="reps"
                    name="reps"
                    type="number"
                    min={1}
                    required
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="weight" className="text-sm font-medium text-stone-700">
                    Weight (optional)
                  </label>
                  <input
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.1"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="performedOn" className="text-sm font-medium text-stone-700">
                  Date
                </label>
                <input
                  id="performedOn"
                  name="performedOn"
                  type="date"
                  required
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="workoutProgramId" className="text-sm font-medium text-stone-700">
                  Program (optional)
                </label>
                <select
                  id="workoutProgramId"
                  name="workoutProgramId"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                >
                  <option value="">No program selected</option>
                  {safePrograms.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium text-stone-700">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
              >
                Save workout log
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">History</h2>
              <p className="text-sm text-stone-500">{safeLogs.length} total</p>
            </div>

            {safeLogs.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
                No workout logs yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {safeLogs.map((log) => (
                  <article key={log.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-semibold text-ink">{log.exercise_name}</p>
                      <p className="text-xs text-stone-500">{log.performed_on}</p>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      {log.sets} sets × {log.reps} reps
                      {log.weight !== null ? ` @ ${log.weight}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Program: {log.workout_programs?.title ?? "Unassigned"}
                    </p>
                    {log.notes ? (
                      <p className="mt-2 text-sm leading-6 text-stone-700">{log.notes}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}