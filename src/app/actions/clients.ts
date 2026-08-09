"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createClient(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "trainer") {
    redirect("/dashboard/clients?status=forbidden");
    return;
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const emailInput = String(formData.get("email") ?? "").trim();
  const notesInput = String(formData.get("notes") ?? "").trim();
  const selfTrack = formData.get("selfTrack") === "on";

  if (!firstName || !lastName) {
    redirect("/dashboard/clients?status=missing-fields");
    return;
  }

  const email = emailInput.length > 0 ? emailInput : null;
  const notes = notesInput.length > 0 ? notesInput : null;

  const supabase = await createSupabaseServerClient();

  // A trainer can track their own workouts by linking exactly one client
  // record to their own auth user (clients_auth_user_id_unique_idx enforces
  // "exactly one" at the DB level). This only ever happens through a brand
  // new insert scoped to this checkbox — never a link action on an existing
  // row — so there's no path where a trainer could accidentally attach
  // themselves to a real client's already-existing record.
  if (selfTrack) {
    const { data: existingSelfLink } = await supabase
      .from("clients")
      .select("id")
      .eq("trainer_id", currentUser.user.id)
      .eq("auth_user_id", currentUser.user.id)
      .maybeSingle<{ id: string }>();

    if (existingSelfLink) {
      redirect("/dashboard/clients?status=already-self-linked");
      return;
    }
  }

  const { error } = await supabase.from("clients").insert({
    trainer_id: currentUser.user.id,
    first_name: firstName,
    last_name: lastName,
    email,
    notes,
    auth_user_id: selfTrack ? currentUser.user.id : null,
  });

  if (error) {
    const errorCode = encodeURIComponent(error.code ?? "unknown");
    const errorMessage = encodeURIComponent(error.message ?? "Unknown insert error");
    redirect(`/dashboard/clients?status=create-failed&errorCode=${errorCode}&errorMessage=${errorMessage}`);
    return;
  }

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?status=created");
}

export async function updateClient(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "trainer") {
    redirect("/dashboard/clients?status=forbidden");
    return;
  }

  const clientId = String(formData.get("clientId") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const emailInput = String(formData.get("email") ?? "").trim();
  const notesInput = String(formData.get("notes") ?? "").trim();

  if (!clientId || !firstName || !lastName) {
    redirect("/dashboard/clients?status=missing-fields");
    return;
  }

  const email = emailInput.length > 0 ? emailInput : null;
  const notes = notesInput.length > 0 ? notesInput : null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      notes,
    })
    .eq("id", clientId)
    .eq("trainer_id", currentUser.user.id);

  if (error) {
    const errorCode = encodeURIComponent(error.code ?? "unknown");
    const errorMessage = encodeURIComponent(error.message ?? "Unknown update error");
    redirect(`/dashboard/clients?status=update-failed&errorCode=${errorCode}&errorMessage=${errorMessage}`);
    return;
  }

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?status=updated");
}

export async function archiveClient(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "trainer") {
    redirect("/dashboard/clients?status=forbidden");
    return;
  }

  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) {
    redirect("/dashboard/clients?status=archive-failed");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", clientId)
    .eq("trainer_id", currentUser.user.id);

  if (error) {
    const errorCode = encodeURIComponent(error.code ?? "unknown");
    const errorMessage = encodeURIComponent(error.message ?? "Unknown archive error");
    redirect(`/dashboard/clients?status=archive-failed&errorCode=${errorCode}&errorMessage=${errorMessage}`);
    return;
  }

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?status=archived");
}

export async function restoreClient(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "trainer") {
    redirect("/dashboard/clients?status=forbidden");
    return;
  }

  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) {
    redirect("/dashboard/clients?status=restore-failed");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: null })
    .eq("id", clientId)
    .eq("trainer_id", currentUser.user.id);

  if (error) {
    const errorCode = encodeURIComponent(error.code ?? "unknown");
    const errorMessage = encodeURIComponent(error.message ?? "Unknown restore error");
    redirect(`/dashboard/clients?status=restore-failed&errorCode=${errorCode}&errorMessage=${errorMessage}`);
    return;
  }

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?status=restored");
}