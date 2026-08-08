import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createWorkoutProgram,
  deleteWorkoutProgram,
  updateWorkoutProgram,
  updateWorkoutProgramDays,
} from "@/app/actions/programs";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ProgramDayBuilder, type InitialWorkoutDay } from "@/components/program-day-builder";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
  archived_at: string | null;
};

type ExerciseRow = {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  target_weight: number | null;
  notes: string | null;
  sort_order: number;
};

type DayRow = {
  id: string;
  day_number: number;
  day_label: string;
  sort_order: number;
  workout_program_exercises: ExerciseRow[];
};

type ProgramRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  duration_weeks: number;
  client_id: string;
  created_at: string;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
  workout_program_days: DayRow[];
};

// Group a program's flat day rows (one row per workout, day_number can
// repeat) into the builder's per-day-number shape for pre-population.
function toInitialWorkoutDays(days: DayRow[]): InitialWorkoutDay[] {
  const byDayNumber = new Map<number, DayRow[]>();
  for (const day of days) {
    const group = byDayNumber.get(day.day_number) ?? [];
    group.push(day);
    byDayNumber.set(day.day_number, group);
  }

  return Array.from(byDayNumber.entries()).map(([dayNumber, dayWorkouts]) => ({
    dayNumber,
    workouts: dayWorkouts
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((workout) => ({
        label: workout.day_label,
        exercises: workout.workout_program_exercises
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((exercise) => ({
            name: exercise.exercise_name,
            sets: String(exercise.sets),
            reps: String(exercise.reps),
            weight: exercise.target_weight !== null ? String(exercise.target_weight) : "",
            notes: exercise.notes ?? "",
          })),
      })),
  }));
}

type ProgramsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStatusMessage(
  status: string | undefined,
  errorCode: string | undefined,
  errorMessage: string | undefined,
) {
  switch (status) {
    case "created":
      return {
        tone: "success",
        text: "Workout program created successfully.",
      };
    case "updated":
      return {
        tone: "success",
        text: "Workout program updated successfully.",
      };
    case "days-updated":
      return {
        tone: "success",
        text: "Workout schedule updated successfully.",
      };
    case "deleted":
      return {
        tone: "success",
        text: "Workout program deleted.",
      };
    case "missing-fields":
      return {
        tone: "error",
        text: "Fill in client, title, and start date before creating a program.",
      };
    case "invalid-duration":
      return {
        tone: "error",
        text: "Duration must be between 1 and 52 weeks.",
      };
    case "missing-exercises":
      return {
        tone: "error",
        text: "Add at least one valid exercise line before saving.",
      };
    case "create-failed":
      if (errorCode === "42P01") {
        return {
          tone: "error",
          text: "Program creation failed because workout program tables are missing. Run migration 003 in Supabase SQL Editor.",
        };
      }

      if (errorCode === "42501") {
        return {
          tone: "error",
          text: "Program creation failed due to RLS permissions. Confirm your profile role is trainer and migration 003 policies were applied.",
        };
      }

      if (errorCode === "23503") {
        return {
          tone: "error",
          text: "Program creation failed because the selected client is not valid for this trainer. Reload clients and try again.",
        };
      }

      return {
        tone: "error",
        text: `Program creation failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    case "update-failed":
      return {
        tone: "error",
        text: `Program update failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    case "days-update-failed":
      return {
        tone: "error",
        text: `Workout schedule update failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    case "delete-failed":
      return {
        tone: "error",
        text: `Program delete failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    case "forbidden":
      return {
        tone: "error",
        text: "Only trainer accounts can create workout programs.",
      };
    default:
      return null;
  }
}

export default async function ProgramsPage({ searchParams }: ProgramsPageProps) {
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

  if (currentUser.role !== "trainer") {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, archived_at")
    .eq("trainer_id", currentUser.user.id)
    .order("created_at", { ascending: false })
    .returns<ClientOption[]>();

  const allClients = clients ?? [];
  // Archived clients shouldn't be offered for *new* assignments, but an existing
  // program's edit dropdown still needs to include its current client even if
  // archived since then — otherwise saving would silently reassign it.
  const assignableClients = allClients.filter((client) => !client.archived_at);

  const { data: programs } = await supabase
    .from("workout_programs")
    .select(
      "id, title, description, start_date, duration_weeks, client_id, created_at, clients(first_name,last_name), workout_program_days(id,day_number,day_label,sort_order,workout_program_exercises(id,exercise_name,sets,reps,target_weight,notes,sort_order))",
    )
    .eq("trainer_id", currentUser.user.id)
    .order("created_at", { ascending: false })
    .returns<ProgramRow[]>();

  const safePrograms = programs ?? [];

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
              Trainer programs
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Create workout programs
            </h1>
            <p className="text-sm leading-6 text-stone-600">
              Build a program manually for one client with day-by-day exercise lines.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <h2 className="text-lg font-semibold text-ink">Add program</h2>

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

            {assignableClients.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600">
                You need at least one active client before creating a program.
                <Link href="/dashboard/clients" className="ml-2 font-medium text-ink underline">
                  Create a client first
                </Link>
              </div>
            ) : (
              <form action={createWorkoutProgram} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="clientId" className="text-sm font-medium text-stone-700">
                    Client
                  </label>
                  <select
                    id="clientId"
                    name="clientId"
                    required
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                  >
                    <option value="">Select client</option>
                    {assignableClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium text-stone-700">
                    Program title
                  </label>
                  <input
                    id="title"
                    name="title"
                    required
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="startDate" className="text-sm font-medium text-stone-700">
                      Start date
                    </label>
                    <input
                      id="startDate"
                      name="startDate"
                      type="date"
                      required
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="durationWeeks" className="text-sm font-medium text-stone-700">
                      Duration (weeks)
                    </label>
                    <input
                      id="durationWeeks"
                      name="durationWeeks"
                      type="number"
                      min={1}
                      max={52}
                      defaultValue={4}
                      required
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium text-stone-700">
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-stone-700">Weekly schedule</p>
                  <p className="text-xs text-stone-500">
                    Add a workout to any day that trains. Use &ldquo;+ Add workout&rdquo; on a day
                    more than once if the client trains twice that day.
                  </p>
                  <ProgramDayBuilder fieldName="daysJson" />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full bg-gold-deep px-5 py-3 text-sm font-medium text-white transition hover:bg-ink"
                >
                  Create program
                </button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Program list</h2>
              <p className="text-sm text-stone-500">{safePrograms.length} total</p>
            </div>

            {safePrograms.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
                No programs yet. Create your first one with the form.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {safePrograms.map((program) => (
                  <article
                    key={program.id}
                    className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <details className="group">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-ink">{program.title}</h3>
                          <p className="mt-1 text-sm text-stone-700">
                            Client: {program.clients?.first_name} {program.clients?.last_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <span
                            aria-hidden="true"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white text-lg font-semibold text-stone-700 shadow-sm transition-transform group-open:rotate-180"
                          >
                            ▾
                          </span>
                          <div>
                            <p className="text-xs text-stone-500">
                              Added {new Date(program.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-stone-600">
                              Starts {program.start_date} · {program.duration_weeks} weeks
                            </p>
                          </div>
                        </div>
                      </summary>

                      <form action={updateWorkoutProgram} className="mt-3 grid gap-3 border-t border-stone-200 pt-3">
                        <input type="hidden" name="programId" value={program.id} />

                        <div className="space-y-1">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500" htmlFor={`client-${program.id}`}>
                            Client
                          </label>
                          <select
                            id={`client-${program.id}`}
                            name="clientId"
                            defaultValue={program.client_id}
                            required
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                          >
                            {allClients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.first_name} {client.last_name}
                                {client.archived_at ? " (archived)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500" htmlFor={`title-${program.id}`}>
                            Title
                          </label>
                          <input
                            id={`title-${program.id}`}
                            name="title"
                            defaultValue={program.title}
                            required
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500" htmlFor={`startDate-${program.id}`}>
                              Start date
                            </label>
                            <input
                              id={`startDate-${program.id}`}
                              name="startDate"
                              type="date"
                              defaultValue={program.start_date}
                              required
                              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500" htmlFor={`durationWeeks-${program.id}`}>
                              Duration (weeks)
                            </label>
                            <input
                              id={`durationWeeks-${program.id}`}
                              name="durationWeeks"
                              type="number"
                              min={1}
                              max={52}
                              defaultValue={program.duration_weeks}
                              required
                              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500" htmlFor={`description-${program.id}`}>
                            Description
                          </label>
                          <textarea
                            id={`description-${program.id}`}
                            name="description"
                            rows={3}
                            defaultValue={program.description ?? ""}
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                          />
                        </div>

                        <button
                          type="submit"
                          className="inline-flex w-fit items-center justify-center rounded-full bg-gold-deep px-4 py-2 text-xs font-medium text-white transition hover:bg-ink"
                        >
                          Save changes
                        </button>
                      </form>

                      <form action={updateWorkoutProgramDays} className="mt-4 space-y-2 border-t border-stone-200 pt-3">
                        <input type="hidden" name="programId" value={program.id} />
                        <p className="text-sm font-medium text-stone-700">Weekly schedule</p>
                        <p className="text-xs text-stone-500">
                          Saving replaces this program&rsquo;s full day/workout/exercise structure with what&rsquo;s
                          below. The client&rsquo;s already-logged history is not affected.
                        </p>
                        <ProgramDayBuilder
                          fieldName="daysJson"
                          initialDays={toInitialWorkoutDays(program.workout_program_days)}
                        />
                        <ConfirmSubmitButton
                          confirmMessage="Save this workout schedule? It replaces all days, workouts, and exercises currently on this program."
                          className="inline-flex w-fit items-center justify-center rounded-full bg-gold-deep px-4 py-2 text-xs font-medium text-white transition hover:bg-ink"
                        >
                          Save workout schedule
                        </ConfirmSubmitButton>
                      </form>

                      <form action={deleteWorkoutProgram} className="mt-2">
                        <input type="hidden" name="programId" value={program.id} />
                        <ConfirmSubmitButton
                          confirmMessage={`Delete "${program.title}"? This permanently removes its day and exercise structure and cannot be undone. The client's already-logged history is kept.`}
                          className="inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                        >
                          Delete program
                        </ConfirmSubmitButton>
                        <p className="mt-1 text-xs text-red-600">
                          Deleting a program removes its day and exercise structure. Logged history is kept.
                        </p>
                      </form>
                    </details>
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