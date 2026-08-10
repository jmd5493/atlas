import Link from "next/link";
import { redirect } from "next/navigation";

import { archiveClient, createClient, restoreClient, updateClient } from "@/app/actions/clients";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  archived_at: string | null;
};

type SelfLinkedClientRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type ClientsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStatusMessage(
  status: string | undefined,
  errorCode: string | undefined,
  errorMessage: string | undefined,
) {
  switch (status) {
    case "created":
      return { tone: "success", text: "Client created." };
    case "updated":
      return { tone: "success", text: "Client updated." };
    case "archived":
      return { tone: "success", text: "Client archived. Their history is preserved." };
    case "restored":
      return { tone: "success", text: "Client restored." };
    case "missing-fields":
      return { tone: "error", text: "First name and last name are required." };
    case "already-self-linked":
      return {
        tone: "error",
        text: "You already have a linked tracking profile. Only one is allowed per trainer account.",
      };
    case "create-failed":
      return {
        tone: "error",
        text: `Create failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    case "update-failed":
      return {
        tone: "error",
        text: `Update failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    case "archive-failed":
      return {
        tone: "error",
        text: `Archive failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    case "restore-failed":
      return {
        tone: "error",
        text: `Restore failed (${errorCode ?? "unknown"}): ${errorMessage ?? "Unknown error"}`,
      };
    case "forbidden":
      return { tone: "error", text: "Only trainer accounts can manage clients." };
    default:
      return null;
  }
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const statusValue = resolvedParams?.status;
  const status = Array.isArray(statusValue) ? statusValue[0] : statusValue;
  const errorCodeValue = resolvedParams?.errorCode;
  const errorCode = Array.isArray(errorCodeValue) ? errorCodeValue[0] : errorCodeValue;
  const errorMessageValue = resolvedParams?.errorMessage;
  const errorMessage = Array.isArray(errorMessageValue) ? errorMessageValue[0] : errorMessageValue;
  const statusMessage = getStatusMessage(status, errorCode, errorMessage);

  const viewValue = resolvedParams?.view;
  const view = (Array.isArray(viewValue) ? viewValue[0] : viewValue) === "archived" ? "archived" : "active";

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "trainer") {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const clientsQuery = supabase
    .from("clients")
    .select("id, first_name, last_name, email, notes, created_at, archived_at")
    .eq("trainer_id", currentUser.user.id)
    .order("created_at", { ascending: false });

  const { data: clients } =
    view === "archived"
      ? await clientsQuery.not("archived_at", "is", null).returns<ClientRow[]>()
      : await clientsQuery.is("archived_at", null).returns<ClientRow[]>();

  const safeClients = clients ?? [];

  // Independent of the active/archived view filter above — a trainer's own
  // tracking profile should be found (and the create-form checkbox hidden)
  // regardless of which list they're currently looking at.
  const { data: selfLinkedClient } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .eq("trainer_id", currentUser.user.id)
    .eq("auth_user_id", currentUser.user.id)
    .maybeSingle<SelfLinkedClientRow>();

  return (
    <main className="min-h-screen bg-ink px-5 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-gold-deep">
              Trainer clients
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Manage clients
            </h1>
            <p className="text-sm leading-6 text-stone-600">
              Create and manage client records before assigning workout programs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={view === "archived" ? "/dashboard/clients" : "/dashboard/clients?view=archived"}
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
            >
              {view === "archived" ? "View active clients" : "View archived clients"}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-gold-deep hover:text-gold-deep"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            <h2 className="text-lg font-semibold text-ink">Add client</h2>

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

            {selfLinkedClient ? (
              <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                You&rsquo;re tracking your own workouts as{" "}
                <span className="font-medium text-ink">
                  {selfLinkedClient.first_name} {selfLinkedClient.last_name}
                </span>
                .{" "}
                <Link href="/dashboard/workouts" className="font-medium text-gold-deep underline">
                  Go log a workout
                </Link>
              </div>
            ) : null}

            <form action={createClient} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-stone-700">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  required
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-stone-700">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  required
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-stone-700">
                  Email (optional)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-gold-deep"
                />
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
              {selfLinkedClient ? null : (
                <label className="flex items-start gap-2 rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    name="selfTrack"
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-gold-deep focus:ring-gold-deep"
                  />
                  <span>
                    This is me: create a linked profile so I can track my own
                    workouts too. (One per trainer account.)
                  </span>
                </label>
              )}
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-gold-deep px-5 py-3 text-sm font-medium text-white transition hover:bg-ink"
              >
                Create client
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">
                {view === "archived" ? "Archived clients" : "Client list"}
              </h2>
              <p className="text-sm text-stone-500">{safeClients.length} total</p>
            </div>

            {safeClients.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-600">
                {view === "archived"
                  ? "No archived clients."
                  : "No clients yet. Add your first client using the form."}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {safeClients.map((client) => (
                  <article
                    key={client.id}
                    className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <details className="group">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-ink">
                            {client.first_name} {client.last_name}
                          </h3>
                          <p className="text-sm text-stone-600">{client.email ?? "No email saved"}</p>
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
                            Added {new Date(client.created_at).toLocaleDateString()}
                          </p>
                          </div>
                        </div>
                      </summary>

                      {view === "archived" ? (
                        <div className="mt-3 grid gap-3 border-t border-stone-200 pt-3">
                          <p className="text-xs text-stone-500">
                            Archived {client.archived_at ? new Date(client.archived_at).toLocaleDateString() : ""}.
                            Their programs and logs are preserved and reappear once restored.
                          </p>
                          <form action={restoreClient}>
                            <input type="hidden" name="clientId" value={client.id} />
                            <ConfirmSubmitButton
                              confirmMessage={`Restore ${client.first_name} ${client.last_name}? They will reappear in your active client list.`}
                              className="inline-flex items-center justify-center rounded-full bg-gold-deep px-4 py-2 text-xs font-medium text-white transition hover:bg-ink"
                            >
                              Restore client
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      ) : (
                        <>
                          <form action={updateClient} className="mt-3 grid gap-3 border-t border-stone-200 pt-3">
                            <input type="hidden" name="clientId" value={client.id} />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500" htmlFor={`firstName-${client.id}`}>
                                  First name
                                </label>
                                <input
                                  id={`firstName-${client.id}`}
                                  name="firstName"
                                  defaultValue={client.first_name}
                                  required
                                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500" htmlFor={`lastName-${client.id}`}>
                                  Last name
                                </label>
                                <input
                                  id={`lastName-${client.id}`}
                                  name="lastName"
                                  defaultValue={client.last_name}
                                  required
                                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500" htmlFor={`email-${client.id}`}>
                                Email
                              </label>
                              <input
                                id={`email-${client.id}`}
                                name="email"
                                defaultValue={client.email ?? ""}
                                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500" htmlFor={`notes-${client.id}`}>
                                Notes
                              </label>
                              <textarea
                                id={`notes-${client.id}`}
                                name="notes"
                                rows={3}
                                defaultValue={client.notes ?? ""}
                                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-gold-deep"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-full bg-gold-deep px-4 py-2 text-xs font-medium text-white transition hover:bg-ink"
                              >
                                Save changes
                              </button>
                            </div>
                          </form>

                          <form action={archiveClient} className="mt-2">
                            <input type="hidden" name="clientId" value={client.id} />
                            <ConfirmSubmitButton
                              confirmMessage={`Archive ${client.first_name} ${client.last_name}? They'll be hidden from your active list but their programs and logs stay intact, and you can restore them anytime.`}
                              className="inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                            >
                              Archive client
                            </ConfirmSubmitButton>
                            <p className="mt-1 text-xs text-stone-500">
                              Archiving hides this client without deleting their programs or logs.
                            </p>
                          </form>
                        </>
                      )}
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