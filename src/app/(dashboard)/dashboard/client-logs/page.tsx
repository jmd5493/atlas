import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteExerciseLog } from "@/app/actions/logs";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClientLogRow = {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
  performed_on: string;
  created_at: string;
  client_id: string;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
  workout_programs: {
    title: string;
  } | null;
};

type ClientLogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// exercise_logs.client_id is a NOT NULL FK with ON DELETE CASCADE, so a log
// can't outlive its client row at the DB level — but the joined `clients`
// is still typed nullable (PostgREST to-one joins always are), and RLS on
// `clients` could in principle disagree with RLS on `exercise_logs` for the
// same trainer. Handle it explicitly rather than let a null silently turn
// into blank text or an empty-string sort key.
function getClientDisplayName(clients: ClientLogRow["clients"]) {
  if (!clients) return "Unknown client";
  return `${clients.first_name} ${clients.last_name}`.trim();
}

function getStatusMessage(status: string | undefined, errorCode: string | undefined, errorMessage: string | undefined) {
  switch (status) {
    case "deleted":
      return { tone: "success", text: "Log entry deleted." };
    case "delete-failed":
      return {
        tone: "error",
        text: `Delete failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    default:
      return null;
  }
}

export default async function ClientLogsPage({ searchParams }: ClientLogsPageProps) {
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
  const { data: logs } = await supabase
    .from("exercise_logs")
    .select(
      "id, exercise_name, sets, reps, weight, notes, performed_on, created_at, client_id, clients(first_name,last_name), workout_programs(title)",
    )
    .eq("trainer_id", currentUser.user.id)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ClientLogRow[]>();

  const safeLogs = logs ?? [];

  // Grouped by client for the trainer's review, not one flat feed of every
  // client's entries interleaved by date. Logs within a client stay in the
  // query's own date-descending order; clients are then sorted by name so
  // the page reads the same way on every visit rather than shuffling by
  // whoever logged most recently.
  const groupedByClient = Array.from(
    safeLogs.reduce((groups, log) => {
      const group = groups.get(log.client_id) ?? [];
      group.push(log);
      groups.set(log.client_id, group);
      return groups;
    }, new Map<string, ClientLogRow[]>()),
  ).sort(([, logsA], [, logsB]) =>
    getClientDisplayName(logsA[0].clients).localeCompare(getClientDisplayName(logsB[0].clients)),
  );

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
              Trainer review
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              Client workout logs
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Review client-submitted exercise logs.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
          >
            Back to dashboard
          </Link>
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

        {safeLogs.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
            No client logs yet.
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {groupedByClient.map(([clientId, clientLogs]) => (
              <div key={clientId}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                  {getClientDisplayName(clientLogs[0].clients)}
                  <span className="ml-2 font-normal text-stone-400">{clientLogs.length} entries</span>
                </h2>
                <div className="mt-3 space-y-3">
                  {clientLogs.map((log) => (
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
                      <form action={deleteExerciseLog} className="mt-2">
                        <input type="hidden" name="logId" value={log.id} />
                        <input type="hidden" name="redirectTo" value="/dashboard/client-logs" />
                        <ConfirmSubmitButton
                          confirmMessage={`Delete ${log.clients?.first_name ?? "this client"}'s ${log.exercise_name} entry from ${log.performed_on}? This can't be undone.`}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete entry
                        </ConfirmSubmitButton>
                      </form>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
