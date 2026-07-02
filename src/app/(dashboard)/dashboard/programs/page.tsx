import Link from "next/link";
import { redirect } from "next/navigation";

import { createWorkoutProgram } from "@/app/actions/programs";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
};

type ProgramRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  duration_weeks: number;
  created_at: string;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
};

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
        text: "Add at least one valid exercise line to create a program.",
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
    .select("id, first_name, last_name")
    .eq("trainer_id", currentUser.user.id)
    .order("created_at", { ascending: false })
    .returns<ClientOption[]>();

  const { data: programs } = await supabase
    .from("workout_programs")
    .select("id, title, description, start_date, duration_weeks, created_at, clients(first_name,last_name)")
    .eq("trainer_id", currentUser.user.id)
    .order("created_at", { ascending: false })
    .returns<ProgramRow[]>();

  const safeClients = clients ?? [];
  const safePrograms = programs ?? [];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fcfbf8_0%,_#f4efe4_100%)] px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(32,26,18,0.08)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
              Trainer programs
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Create workout programs
            </h1>
            <p className="text-sm leading-6 text-stone-600">
              Build a program manually for one client with day-by-day exercise lines.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
          >
            Back to dashboard
          </Link>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <h2 className="text-lg font-semibold text-slate-950">Add program</h2>

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

            {safeClients.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600">
                You need at least one client before creating a program.
                <Link href="/dashboard/clients" className="ml-2 font-medium text-slate-900 underline">
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
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    <option value="">Select client</option>
                    {safeClients.map((client) => (
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
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
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
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
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
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
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
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                {[1, 2, 3].map((dayNumber) => (
                  <div key={dayNumber} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="space-y-2">
                      <label
                        htmlFor={`day${dayNumber}Label`}
                        className="text-sm font-medium text-stone-700"
                      >
                        Day {dayNumber} label
                      </label>
                      <input
                        id={`day${dayNumber}Label`}
                        name={`day${dayNumber}Label`}
                        defaultValue={`Day ${dayNumber}`}
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                      />
                    </div>

                    <div className="mt-3 space-y-2">
                      <label
                        htmlFor={`day${dayNumber}Exercises`}
                        className="text-sm font-medium text-stone-700"
                      >
                        Exercises (one per line)
                      </label>
                      <textarea
                        id={`day${dayNumber}Exercises`}
                        name={`day${dayNumber}Exercises`}
                        rows={4}
                        required={dayNumber === 1}
                        placeholder="Back Squat | 4 | 8 | 185 | Warm up, then working sets"
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                      />
                      <p className="text-xs text-stone-500">
                        Format examples: Back Squat | 4 | 8 | 185 | Notes, Back Squat 4x8 @185 - Notes,
                        or Back Squat 4 sets 8 reps 185 lb
                      </p>
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Create program
                </button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Program list</h2>
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-semibold text-slate-900">{program.title}</p>
                      <p className="text-xs text-stone-500">
                        Added {new Date(program.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-stone-700">
                      Client: {program.clients?.first_name} {program.clients?.last_name}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      Starts {program.start_date} · {program.duration_weeks} weeks
                    </p>
                    {program.description ? (
                      <p className="mt-2 text-sm leading-6 text-stone-700">{program.description}</p>
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