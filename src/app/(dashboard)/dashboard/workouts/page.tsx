import Link from "next/link";
import { redirect } from "next/navigation";

import { createExerciseLog } from "@/app/actions/logs";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WorkoutsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type LinkedClientRow = {
  id: string;
  first_name: string;
  last_name: string;
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
  workout_program_days: DayRow[];
};

function getStatusMessage(
  status: string | undefined,
  errorCode: string | undefined,
  errorMessage: string | undefined,
) {
  switch (status) {
    case "created":
      return { tone: "success", text: "Exercise log saved from workout plan." };
    case "missing-fields":
      return { tone: "error", text: "Please fill in sets, reps, and date for the exercise log." };
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

export default async function WorkoutsPage({ searchParams }: WorkoutsPageProps) {
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
          <h1 className="text-2xl font-semibold text-ink">Assigned workouts</h1>
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
    .select(
      "id, title, description, start_date, duration_weeks, workout_program_days(id,day_number,day_label,sort_order,workout_program_exercises(id,exercise_name,sets,reps,target_weight,notes,sort_order))",
    )
    .eq("client_id", linkedClient.id)
    .order("created_at", { ascending: false })
    .returns<ProgramRow[]>();

  const safePrograms = programs ?? [];

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-700">
              Client workouts
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              Assigned programs
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Viewing programs for {linkedClient.first_name} {linkedClient.last_name}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Log each exercise directly from this page. Did something extra, or need to log an
              earlier date? Use &ldquo;Log something extra&rdquo; instead.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/logs"
              className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-5 py-3 text-sm font-medium text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
            >
              Log something extra
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        {statusMessage ? (
          <div
            className={
              statusMessage.tone === "success"
                ? "mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                : "mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {statusMessage.text}
          </div>
        ) : null}

        {safePrograms.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
            No workout programs assigned yet.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {safePrograms.map((program) => (
              <article key={program.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <h2 className="text-xl font-semibold text-ink">{program.title}</h2>
                <p className="mt-2 text-sm text-stone-600">
                  Starts {program.start_date} · {program.duration_weeks} weeks
                </p>
                {program.description ? (
                  <p className="mt-3 text-sm leading-6 text-stone-700">{program.description}</p>
                ) : null}

                <div className="mt-4 space-y-6">
                  {Array.from(
                    program.workout_program_days.reduce((groups, day) => {
                      const group = groups.get(day.day_number) ?? [];
                      group.push(day);
                      groups.set(day.day_number, group);
                      return groups;
                    }, new Map<number, DayRow[]>()),
                  )
                    .sort(([dayNumberA], [dayNumberB]) => dayNumberA - dayNumberB)
                    .map(([dayNumber, dayWorkouts]) => (
                      <div key={dayNumber}>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                          Day {dayNumber}
                        </h3>
                        <div className="mt-2 grid gap-4 md:grid-cols-2">
                          {dayWorkouts
                            .slice()
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((day) => (
                              <section key={day.id} className="rounded-xl border border-stone-200 bg-white p-4">
                                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-600">
                                  {day.day_label}
                                </h4>
                                {day.workout_program_exercises.length === 0 ? (
                          <p className="mt-3 text-sm text-stone-500">No exercises listed.</p>
                        ) : (
                          <ul className="mt-3 space-y-2 text-sm text-stone-700">
                            {day.workout_program_exercises
                              .slice()
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((exercise) => (
                                <li key={exercise.id} className="rounded-lg bg-stone-50 px-3 py-3">
                                  <p className="font-medium text-ink">{exercise.exercise_name}</p>
                                  <p className="text-stone-600">
                                    {exercise.sets} sets × {exercise.reps} reps
                                    {exercise.target_weight !== null ? ` @ ${exercise.target_weight}` : ""}
                                  </p>
                                  {exercise.notes ? (
                                    <p className="mt-1 text-xs text-stone-500">{exercise.notes}</p>
                                  ) : null}

                                  <form action={createExerciseLog} className="mt-3 grid gap-2 rounded-lg border border-stone-200 bg-white p-3">
                                    <input type="hidden" name="redirectTo" value="/dashboard/workouts" />
                                    <input type="hidden" name="workoutProgramId" value={program.id} />
                                    <input type="hidden" name="exerciseName" value={exercise.exercise_name} />

                                    <div className="grid gap-2 sm:grid-cols-4">
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500" htmlFor={`sets-${exercise.id}`}>
                                          Sets
                                        </label>
                                        <input
                                          id={`sets-${exercise.id}`}
                                          name="sets"
                                          type="number"
                                          min={1}
                                          defaultValue={exercise.sets}
                                          required
                                          className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500" htmlFor={`reps-${exercise.id}`}>
                                          Reps
                                        </label>
                                        <input
                                          id={`reps-${exercise.id}`}
                                          name="reps"
                                          type="number"
                                          min={1}
                                          defaultValue={exercise.reps}
                                          required
                                          className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500" htmlFor={`weight-${exercise.id}`}>
                                          Weight
                                        </label>
                                        <input
                                          id={`weight-${exercise.id}`}
                                          name="weight"
                                          type="number"
                                          step="0.1"
                                          defaultValue={exercise.target_weight ?? ""}
                                          className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500" htmlFor={`date-${exercise.id}`}>
                                          Date
                                        </label>
                                        <input
                                          id={`date-${exercise.id}`}
                                          name="performedOn"
                                          type="date"
                                          defaultValue={new Date().toISOString().slice(0, 10)}
                                          required
                                          className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500" htmlFor={`notes-${exercise.id}`}>
                                        Notes (optional)
                                      </label>
                                      <input
                                        id={`notes-${exercise.id}`}
                                        name="notes"
                                        placeholder={`Logged from ${day.day_label}`}
                                        className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                                      />
                                    </div>

                                    <ConfirmSubmitButton
                                      confirmMessage={`Log ${exercise.exercise_name} with the sets, reps, and weight you entered above?`}
                                      className="inline-flex w-fit items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-600"
                                    >
                                      Log this exercise
                                    </ConfirmSubmitButton>
                                  </form>
                                </li>
                              ))}
                          </ul>
                        )}
                              </section>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}