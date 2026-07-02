import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export default async function WorkoutsPage() {
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
      <main className="min-h-screen bg-[linear-gradient(180deg,_#fcfbf8_0%,_#f4efe4_100%)] px-5 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-4xl rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(32,26,18,0.08)] sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-950">Assigned workouts</h1>
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
      "id, title, description, start_date, duration_weeks, workout_program_days(id,day_label,sort_order,workout_program_exercises(id,exercise_name,sets,reps,target_weight,notes,sort_order))",
    )
    .eq("client_id", linkedClient.id)
    .order("created_at", { ascending: false })
    .returns<ProgramRow[]>();

  const safePrograms = programs ?? [];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fcfbf8_0%,_#f4efe4_100%)] px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(32,26,18,0.08)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-700">
              Client workouts
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Assigned programs
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Viewing programs for {linkedClient.first_name} {linkedClient.last_name}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
          >
            Back to dashboard
          </Link>
        </header>

        {safePrograms.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
            No workout programs assigned yet.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {safePrograms.map((program) => (
              <article key={program.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <h2 className="text-xl font-semibold text-slate-950">{program.title}</h2>
                <p className="mt-2 text-sm text-stone-600">
                  Starts {program.start_date} · {program.duration_weeks} weeks
                </p>
                {program.description ? (
                  <p className="mt-3 text-sm leading-6 text-stone-700">{program.description}</p>
                ) : null}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {program.workout_program_days
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((day) => (
                      <section key={day.id} className="rounded-xl border border-stone-200 bg-white p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-600">
                          {day.day_label}
                        </h3>
                        {day.workout_program_exercises.length === 0 ? (
                          <p className="mt-3 text-sm text-stone-500">No exercises listed.</p>
                        ) : (
                          <ul className="mt-3 space-y-2 text-sm text-stone-700">
                            {day.workout_program_exercises
                              .slice()
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((exercise) => (
                                <li key={exercise.id} className="rounded-lg bg-stone-50 px-3 py-2">
                                  <p className="font-medium text-slate-900">{exercise.exercise_name}</p>
                                  <p className="text-stone-600">
                                    {exercise.sets} sets × {exercise.reps} reps
                                    {exercise.target_weight !== null ? ` @ ${exercise.target_weight}` : ""}
                                  </p>
                                  {exercise.notes ? (
                                    <p className="mt-1 text-xs text-stone-500">{exercise.notes}</p>
                                  ) : null}
                                </li>
                              ))}
                          </ul>
                        )}
                      </section>
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