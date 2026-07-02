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

  if (!firstName || !lastName) {
    redirect("/dashboard/clients?status=missing-fields");
    return;
  }

  const email = emailInput.length > 0 ? emailInput : null;
  const notes = notesInput.length > 0 ? notesInput : null;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("clients").insert({
    trainer_id: currentUser.user.id,
    first_name: firstName,
    last_name: lastName,
    email,
    notes,
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

export async function deleteClient(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "trainer") {
    redirect("/dashboard/clients?status=forbidden");
    return;
  }

  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) {
    redirect("/dashboard/clients?status=delete-failed");
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("trainer_id", currentUser.user.id);

  if (error) {
    const errorCode = encodeURIComponent(error.code ?? "unknown");
    const errorMessage = encodeURIComponent(error.message ?? "Unknown delete error");
    redirect(`/dashboard/clients?status=delete-failed&errorCode=${errorCode}&errorMessage=${errorMessage}`);
    return;
  }

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?status=deleted");
}